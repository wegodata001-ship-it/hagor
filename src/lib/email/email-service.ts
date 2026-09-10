import "server-only";

import { getAppUrl } from "@/lib/app-url";
import { getEmailConfig } from "@/lib/email/config";
import {
  markCustomerConfirmationEmailSent,
  markOrderEmailFailed,
  markOwnerPaidEmailSent,
  wasCustomerConfirmationEmailSent,
  wasOwnerPaidEmailSent,
} from "@/lib/email/email-idempotency";
import { emailButton, escapeHtml, infoRow, wrapEmailHtml } from "@/lib/email/layout";
import {
  formatMoney,
  loadOrderEmailPayload,
  renderOrderItemsHtml,
  type OrderEmailPayload,
} from "@/lib/email/order-data";
import { sendMail } from "@/lib/email/send";
import { buildOrderTrackingUrl } from "@/lib/order-tracking-access";
import { formatOrderDate } from "@/lib/order-tracking";
import { SITE_NAME } from "@/lib/store";

function adminReceiver(): string | null {
  const cfg = getEmailConfig();
  return cfg.contactReceiver || null;
}

function paymentProviderLabel(provider: string | null | undefined): string {
  const p = (provider || "").toLowerCase();
  if (p === "hyp" || p === "hypay") return "Hyp";
  if (p === "demo") return "Demo";
  if (p === "stripe") return "Stripe";
  return provider || "—";
}

function orderBodyBlock(payload: OrderEmailPayload, intro: string, extraRows = ""): string {
  const o = payload.order;
  return `
    <p style="margin:0 0 16px;">${intro}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${infoRow("שם לקוח", escapeHtml(o.customerName))}
      ${infoRow("מספר הזמנה", escapeHtml(o.orderNumber))}
      ${infoRow("תאריך", escapeHtml(formatOrderDate(o.createdAt)))}
      ${infoRow("טלפון", escapeHtml(o.customerPhone))}
      ${infoRow("אימייל", escapeHtml(o.customerEmail))}
      ${infoRow("משלוח", escapeHtml(o.deliveryOptionName))}
      ${infoRow("כתובת", o.address ? escapeHtml(o.address) : "—")}
      ${extraRows}
    </table>
    ${renderOrderItemsHtml(payload.items, payload.currency)}
    <p style="margin:16px 0 0;font-size:18px;font-weight:800;color:#c89211;">סה״כ: ${formatMoney(o.total, payload.currency)}</p>
  `;
}

export async function sendContactLeadEmail(data: {
  name: string;
  phone?: string | null;
  email?: string | null;
  message: string;
}): Promise<void> {
  const to = adminReceiver();
  if (!to) return;
  const body = `
    <p>פנייה חדשה מהאתר.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${infoRow("שם", escapeHtml(data.name))}
      ${infoRow("טלפון", data.phone ? escapeHtml(data.phone) : "—")}
      ${infoRow("אימייל", data.email ? escapeHtml(data.email) : "—")}
    </table>
    <div style="margin-top:16px;padding:14px;background:#0f0f0f;border-radius:10px;white-space:pre-wrap;">${escapeHtml(data.message)}</div>
  `;
  await sendMail({
    to,
    subject: `${SITE_NAME} — פנייה חדשה מ${data.name}`,
    html: wrapEmailHtml("פנייה חדשה", body, `פנייה מ${data.name}`),
    type: "contact_lead",
  });
}

export async function sendContactAutoReplyEmail(data: { name: string; email: string }): Promise<void> {
  if (!data.email.trim()) return;
  const body = `
    <p>שלום ${escapeHtml(data.name)},</p>
    <p>קיבלנו את פנייתך. נחזור אליך בהקדם האפשרי.</p>
    <p style="color:#94a3b8;font-size:13px;">${escapeHtml(SITE_NAME)} — ציוד טקטי</p>
  `;
  await sendMail({
    to: data.email.trim(),
    subject: `${SITE_NAME} — קיבלנו את פנייתך`,
    html: wrapEmailHtml("תודה על הפנייה", body),
    type: "contact_auto_reply",
  });
}

export async function sendOrderCreatedEmail(orderId: string): Promise<void> {
  const to = adminReceiver();
  if (!to) return;
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload) return;
  const body = orderBodyBlock(
    payload,
    `התקבלה הזמנה חדשה (ממתינה לתשלום).`,
  );
  await sendMail({
    to,
    subject: `${SITE_NAME} — הזמנה חדשה ${payload.order.orderNumber}`,
    html: wrapEmailHtml("הזמנה חדשה", body),
    type: "order_created",
  });
}

export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  if (await wasCustomerConfirmationEmailSent(orderId)) return;
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload?.order.customerEmail.trim()) return;
  let track = `${getAppUrl()}/track-order`;
  try {
    track = buildOrderTrackingUrl(orderId);
  } catch {
    /* fall back to public track page */
  }
  const paymentRows = `${infoRow("סטטוס תשלום", "שולם")}${infoRow("ספק תשלום", escapeHtml(paymentProviderLabel(payload.payment?.provider)))}`;
  const body = `${orderBodyBlock(
    payload,
    `שלום ${escapeHtml(payload.order.customerName)},<br/>תודה! התשלום אושר ואנחנו מכינים את ההזמנה.`,
    paymentRows,
  )}<p style="text-align:center;">${emailButton(track, "מעקב אחר ההזמנה")}</p>`;
  const ok = await sendMail({
    to: payload.order.customerEmail,
    subject: `HAGOUR — ההזמנה התקבלה בהצלחה`,
    html: wrapEmailHtml("ההזמנה התקבלה בהצלחה", body),
    type: "order_confirmation",
  });
  if (ok) await markCustomerConfirmationEmailSent(orderId);
  else await markOrderEmailFailed(orderId, "customer_confirmation_failed");
}

/** Customer email after demo checkout — simple Hebrew copy per product spec. */
export async function sendDemoOrderConfirmationEmail(orderId: string): Promise<void> {
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload?.order.customerEmail.trim()) return;
  const o = payload.order;
  const body = `
    <p style="margin:0 0 12px;">שלום ${escapeHtml(o.customerName)}</p>
    <p style="margin:0 0 16px;">הזמנתך התקבלה בהצלחה.</p>
    <p style="margin:0 0 8px;"><strong>מספר הזמנה:</strong><br/>#${escapeHtml(o.orderNumber)}</p>
    <p style="margin:0 0 16px;"><strong>סכום:</strong><br/>${formatMoney(o.total, payload.currency)}</p>
    <p style="margin:0 0 16px;">תודה שבחרת ${escapeHtml(SITE_NAME)}.</p>
    <p style="text-align:center;">${emailButton(`${getAppUrl()}/track-order`, "מעקב אחר ההזמנה")}</p>
  `;
  await sendMail({
    to: o.customerEmail,
    subject: `${SITE_NAME} — אישור הזמנה`,
    html: wrapEmailHtml("אישור הזמנה", body),
    type: "order_confirmation",
  });
}

export async function sendOrderPaidAdminEmail(orderId: string): Promise<void> {
  if (await wasOwnerPaidEmailSent(orderId)) return;
  const to = adminReceiver();
  if (!to) return;
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload) return;
  const extra = `${infoRow("ספק תשלום", escapeHtml(paymentProviderLabel(payload.payment?.provider)))}${infoRow(
    "מזהה עסקה",
    escapeHtml(payload.payment?.transactionId || "—"),
  )}${
    payload.payment?.confirmationNumber
      ? infoRow("אישור", escapeHtml(payload.payment.confirmationNumber))
      : ""
  }`;
  const body = orderBodyBlock(payload, `התקבלה הזמנה חדשה ושולמה.`, extra);
  const ok = await sendMail({
    to,
    subject: `התקבלה הזמנה חדשה ושולמה`,
    html: wrapEmailHtml("הזמנה חדשה שולמה", body),
    type: "order_paid",
  });
  if (ok) await markOwnerPaidEmailSent(orderId);
  else await markOrderEmailFailed(orderId, "owner_paid_email_failed");
}

const FULFILLMENT_LABELS: Record<string, string> = {
  SHIPPED: "ההזמנה נשלחה",
  COMPLETED: "ההזמנה נמסרה",
};

export async function sendOrderStatusEmail(orderId: string, fulfillmentStatus: string): Promise<void> {
  const label = FULFILLMENT_LABELS[fulfillmentStatus];
  if (!label) return;
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload?.order.customerEmail.trim()) return;
  let track = `${getAppUrl()}/track-order`;
  try {
    track = buildOrderTrackingUrl(orderId);
  } catch {
    /* fall back */
  }
  const trackingBlock =
    payload.order.trackingNumber?.trim()
      ? `${infoRow("מספר מעקב", escapeHtml(payload.order.trackingNumber))}${
          payload.order.courierName?.trim()
            ? infoRow("חברת משלוחים", escapeHtml(payload.order.courierName))
            : ""
        }`
      : "";
  const body = `
    <p>שלום ${escapeHtml(payload.order.customerName)},</p>
    <p><strong>${escapeHtml(label)}</strong></p>
    ${infoRow("מספר הזמנה", escapeHtml(payload.order.orderNumber))}
    ${trackingBlock}
    <p style="text-align:center;margin-top:20px;">${emailButton(track, "מעקב אחר ההזמנה")}</p>
  `;
  await sendMail({
    to: payload.order.customerEmail,
    subject: `${SITE_NAME} — ${label} (${payload.order.orderNumber})`,
    html: wrapEmailHtml(label, body),
    type: "order_status",
  });
}

export async function sendWelcomeEmail(data: { name: string; email: string }): Promise<void> {
  const shop = `${getAppUrl()}/products`;
  const body = `
    <p>שלום ${escapeHtml(data.name)},</p>
    <p>חשבונך ב־${escapeHtml(SITE_NAME)} נוצר בהצלחה.</p>
    <p style="text-align:center;">${emailButton(shop, "לקטלוג המוצרים")}</p>
  `;
  await sendMail({
    to: data.email,
    subject: `${SITE_NAME} — ברוכים הבאים`,
    html: wrapEmailHtml("ברוכים הבאים", body),
    type: "welcome",
  });
}

export async function sendVerifyEmail(data: { name: string; email: string; verifyUrl: string }): Promise<void> {
  const body = `
    <p>שלום ${escapeHtml(data.name)},</p>
    <p>לאימות כתובת האימייל לחצו על הכפתור:</p>
    <p style="text-align:center;">${emailButton(data.verifyUrl, "אימות אימייל")}</p>
    <p style="font-size:12px;color:#94a3b8;">הקישור תקף ל-24 שעות.</p>
  `;
  await sendMail({
    to: data.email,
    subject: `${SITE_NAME} — אימות אימייל`,
    html: wrapEmailHtml("אימות אימייל", body),
    type: "verify_email",
  });
}

export async function sendPasswordResetEmail(data: {
  name: string;
  email: string;
  resetUrl: string;
}): Promise<void> {
  const body = `
    <p>שלום ${escapeHtml(data.name)},</p>
    <p>התקבלה בקשה לאיפוס סיסמה. אם לא ביקשת — התעלם ממייל זה.</p>
    <p style="text-align:center;">${emailButton(data.resetUrl, "איפוס סיסמה")}</p>
  `;
  await sendMail({
    to: data.email,
    subject: `${SITE_NAME} — איפוס סיסמה`,
    html: wrapEmailHtml("איפוס סיסמה", body),
    type: "password_reset",
  });
}

export async function sendTestEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const body = `
    <p>זהו מייל בדיקה ממערכת <strong>${escapeHtml(SITE_NAME)}</strong>.</p>
    <p>אם קיבלת הודעה זו — חיבור Brevo SMTP פעיל.</p>
  `;
  const ok = await sendMail({
    to,
    subject: `${SITE_NAME} — מייל בדיקה`,
    html: wrapEmailHtml("מייל בדיקה", body),
    type: "test",
  });
  return ok ? { ok: true } : { ok: false, error: "שליחה נכשלה — בדקו SMTP ב־ENV" };
}

export function queueEmail(task: () => Promise<void>): void {
  void task().catch((err) => {
    console.error("[email] queue_task_failed", err);
  });
}
