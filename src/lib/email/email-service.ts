import "server-only";

import { getAppUrl } from "@/lib/app-url";
import { getEmailConfig } from "@/lib/email/config";
import { emailButton, escapeHtml, infoRow, wrapEmailHtml } from "@/lib/email/layout";
import {
  formatMoney,
  loadOrderEmailPayload,
  renderOrderItemsHtml,
  type OrderEmailPayload,
} from "@/lib/email/order-data";
import { sendMail } from "@/lib/email/send";
import { SITE_NAME } from "@/lib/store";

function adminReceiver(): string | null {
  const cfg = getEmailConfig();
  return cfg.contactReceiver || null;
}

function orderBodyBlock(payload: OrderEmailPayload, intro: string): string {
  const o = payload.order;
  return `
    <p style="margin:0 0 16px;">${intro}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${infoRow("שם לקוח", escapeHtml(o.customerName))}
      ${infoRow("מספר הזמנה", escapeHtml(o.orderNumber))}
      ${infoRow("טלפון", escapeHtml(o.customerPhone))}
      ${infoRow("אימייל", escapeHtml(o.customerEmail))}
      ${infoRow("משלוח", escapeHtml(o.deliveryOptionName))}
      ${infoRow("כתובת", o.address ? escapeHtml(o.address) : "—")}
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
    subject: `HAGOUR — פנייה חדשה מ${data.name}`,
    html: wrapEmailHtml("פנייה חדשה", body, `פנייה מ${data.name}`),
    type: "contact_lead",
  });
}

export async function sendContactAutoReplyEmail(data: { name: string; email: string }): Promise<void> {
  if (!data.email.trim()) return;
  const body = `
    <p>שלום ${escapeHtml(data.name)},</p>
    <p>קיבלנו את פנייתך. נחזור אליך בהקדם האפשרי.</p>
    <p style="color:#94a3b8;font-size:13px;">HAGOUR Tactical Equipment</p>
  `;
  await sendMail({
    to: data.email.trim(),
    subject: `HAGOUR — קיבלנו את פנייתך`,
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
    subject: `HAGOUR — הזמנה חדשה ${payload.order.orderNumber}`,
    html: wrapEmailHtml("הזמנה חדשה", body),
    type: "order_created",
  });
}

export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload?.order.customerEmail.trim()) return;
  const track = `${getAppUrl()}/account/orders`;
  const body = `${orderBodyBlock(payload, `שלום ${escapeHtml(payload.order.customerName)},<br/>תודה! התשלום אושר ואנחנו מכינים את ההזמנה.`)}<p style="text-align:center;">${emailButton(track, "מעקב הזמנה")}</p>`;
  await sendMail({
    to: payload.order.customerEmail,
    subject: `HAGOUR — אישור הזמנה ${payload.order.orderNumber}`,
    html: wrapEmailHtml("אישור הזמנה", body),
    type: "order_confirmation",
  });
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
    <p style="margin:0;">תודה שבחרת HAGOUR.</p>
  `;
  await sendMail({
    to: o.customerEmail,
    subject: "HAGOUR - אישור הזמנה",
    html: wrapEmailHtml("אישור הזמנה", body),
    type: "order_confirmation_demo",
  });
}

export async function sendOrderPaidAdminEmail(orderId: string): Promise<void> {
  const to = adminReceiver();
  if (!to) return;
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload) return;
  const body = orderBodyBlock(payload, `התשלום התקבל בהצלחה.`);
  await sendMail({
    to,
    subject: `HAGOUR — תשלום התקבל ${payload.order.orderNumber}`,
    html: wrapEmailHtml("תשלום התקבל", body),
    type: "order_paid",
  });
}

const FULFILLMENT_LABELS: Record<string, string> = {
  PACKED: "ההזמנה נארזה ומוכנה למשלוח",
  SHIPPED: "ההזמנה נשלחה",
  COMPLETED: "ההזמנה נמסרה",
};

export async function sendOrderStatusEmail(orderId: string, fulfillmentStatus: string): Promise<void> {
  const label = FULFILLMENT_LABELS[fulfillmentStatus];
  if (!label) return;
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload?.order.customerEmail.trim()) return;
  const track = `${getAppUrl()}/account/orders/${orderId}`;
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
    <p style="text-align:center;margin-top:20px;">${emailButton(track, "צפייה בהזמנה")}</p>
  `;
  await sendMail({
    to: payload.order.customerEmail,
    subject: `HAGOUR — ${label} (${payload.order.orderNumber})`,
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
    subject: `HAGOUR — ברוכים הבאים`,
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
    subject: `HAGOUR — אימות אימייל`,
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
    subject: `HAGOUR — איפוס סיסמה`,
    html: wrapEmailHtml("איפוס סיסמה", body),
    type: "password_reset",
  });
}

export async function sendTestEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const body = `
    <p>זהו מייל בדיקה ממערכת <strong>HAGOUR</strong>.</p>
    <p>אם קיבלת הודעה זו — חיבור Brevo SMTP פעיל.</p>
  `;
  const ok = await sendMail({
    to,
    subject: "HAGOUR — מייל בדיקה",
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
