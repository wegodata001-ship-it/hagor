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
  renderOrderTotalsHtml,
  type OrderEmailPayload,
} from "@/lib/email/order-data";
import { sendEmail, sendMail } from "@/lib/email/send";
import { buildOrderTrackingUrl } from "@/lib/order-tracking-access";
import { formatOrderDate, isOrderPaymentSettled } from "@/lib/order-tracking";
import { BRAND_LEGAL_NAME } from "@/lib/brand";
import { SITE_NAME, STORE_ID } from "@/lib/store";
import { renderOrderConfirmationPdfByOrderId } from "@/lib/orders/confirmation-pdf";
import type { OrderPaymentStatus, OrderStatus } from "@prisma/client";

function adminReceiver(): string | null {
  const cfg = getEmailConfig();
  return cfg.contactReceiver || null;
}

function paymentProviderLabel(provider: string | null | undefined): string {
  const p = (provider || "").toLowerCase();
  if (p === "hyp" || p === "hypay") return "כרטיס אשראי";
  if (p === "stripe") return "כרטיס אשראי";
  if (p === "cardcom" || p === "tranzila" || p === "meshulam") return "כרטיס אשראי";
  if (p === "demo") return "תשלום";
  return "כרטיס אשראי";
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
    <p style="margin:20px 0 8px;font-size:14px;font-weight:800;color:#c89211;letter-spacing:0.06em;">פרטי ההזמנה</p>
    ${renderOrderItemsHtml(payload.items, payload.currency)}
    ${renderOrderTotalsHtml(o, payload.currency)}
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

/**
 * Send the "Order Confirmation" email to the customer after a verified paid
 * order. Attaches `HAGOUR-ORDER-<orderNumber>.pdf` — the same PDF generated
 * by the admin invoice archive and the storefront download page — so the
 * customer's copy is bit-for-bit identical to the admin's copy.
 *
 * Idempotent by default: repeated automatic calls (e.g. duplicate HYP
 * callbacks) short-circuit on the audit log. When `opts.manual = true`,
 * this bypass is skipped so the admin can retry from the order details.
 *
 * The caller (payment settlement flow) MUST treat email failure as
 * non-fatal — the order stays PAID even if this returns `false`.
 */
export async function sendOrderConfirmationEmail(
  orderId: string,
  opts: { manual?: boolean; adminUserId?: string; lang?: "he" | "ar" | "en" } = {},
): Promise<boolean> {
  if (!opts.manual && (await wasCustomerConfirmationEmailSent(orderId))) return true;
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload) {
    await markOrderEmailFailed(orderId, "customer_confirmation_order_missing");
    return false;
  }
  if (
    !isOrderPaymentSettled(
      payload.order.paymentStatus as OrderPaymentStatus,
      payload.order.status as OrderStatus,
    )
  ) {
    console.warn("[email] skipped order_confirmation reason=order_not_paid", orderId);
    return false;
  }
  const to = payload.order.customerEmail.trim();
  if (!to) {
    // SKIPPED_NO_EMAIL — this must NOT propagate a failure upstream.
    // The order stays PAID; we just log a benign skip.
    console.info("[email] SKIPPED_NO_EMAIL order_confirmation", orderId);
    await markOrderEmailFailed(orderId, "customer_confirmation_missing_email");
    return false;
  }

  let track = `${getAppUrl()}/track-order`;
  try {
    track = buildOrderTrackingUrl(orderId);
  } catch {
    /* fall back to public track page */
  }

  const o = payload.order;

  // ── PDF attachment. Render in-process from the SAME engine that powers
  //    the admin invoice archive. If PDF generation fails, we still send
  //    the HTML email (never block the customer's confirmation on a PDF
  //    rendering glitch); the send-history flag will record whether the
  //    attachment was included.
  const lang = opts.lang ?? "he";
  let pdf: { bytes: Uint8Array; filename: string; orderNumber: string } | null = null;
  try {
    pdf = await renderOrderConfirmationPdfByOrderId({ storeId: STORE_ID, orderId, lang });
  } catch (err) {
    console.error(
      "[email] PDF_RENDER_FAILED order_confirmation",
      orderId,
      err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    );
    pdf = null;
  }

  const deliveryBlock =
    o.deliveryOptionName || o.address
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
          ${o.deliveryOptionName ? infoRow("שיטת משלוח", escapeHtml(o.deliveryOptionName)) : ""}
          ${o.address ? infoRow("כתובת", escapeHtml(o.address)) : ""}
        </table>`
      : "";

  const attachmentNote = pdf
    ? `<p style="margin:20px 0 8px;font-size:13px;color:#c89211;font-weight:700;">מצורף למייל: אישור הזמנה PDF</p>`
    : "";

  const body = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.18em;color:#c89211;font-weight:800;">${escapeHtml(BRAND_LEGAL_NAME)}</p>
    <p style="margin:0 0 18px;font-size:20px;font-weight:800;color:#fff;">תודה על ההזמנה</p>
    <p style="margin:0 0 16px;">שלום ${escapeHtml(o.customerName)},</p>
    <p style="margin:0 0 18px;">התשלום התקבל בהצלחה וההזמנה שלך נקלטה במערכת.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;">
      ${infoRow("מספר הזמנה", escapeHtml(o.orderNumber))}
      ${infoRow("סכום ששולם", formatMoney(o.total, payload.currency))}
      ${infoRow("סטטוס", "שולם")}
    </table>
    <p style="margin:20px 0 8px;font-size:14px;font-weight:800;color:#c89211;letter-spacing:0.06em;">פרטי ההזמנה</p>
    ${renderOrderItemsHtml(payload.items, payload.currency)}
    ${renderOrderTotalsHtml(o, payload.currency)}
    ${deliveryBlock}
    ${attachmentNote}
    <p style="margin:20px 0 8px;">נעדכן אותך בהמשך לגבי סטטוס ההזמנה.</p>
    <p style="text-align:center;margin-top:8px;">${emailButton(track, "מעקב אחר ההזמנה")}</p>
    <p style="margin:24px 0 0;text-align:center;font-size:12px;letter-spacing:0.16em;color:#c89211;font-weight:800;">${escapeHtml(BRAND_LEGAL_NAME)}</p>
  `;

  // Subject follows the spec: `HAGOUR BY WAEL — אישור הזמנה HAGOR-XXXX`.
  // Localized variants pick up when `opts.lang` is passed by the caller.
  const subjectByLang: Record<"he" | "ar" | "en", string> = {
    he: `${BRAND_LEGAL_NAME} — אישור הזמנה ${o.orderNumber}`,
    ar: `${BRAND_LEGAL_NAME} — تأكيد الطلب ${o.orderNumber}`,
    en: `${BRAND_LEGAL_NAME} — Order Confirmation ${o.orderNumber}`,
  };
  const subject = subjectByLang[lang];

  // Switch to `sendEmail` (not `sendMail`) so we can capture the provider
  // message id for admin display. Attach the PDF if we have one.
  const result = await sendEmail({
    to,
    subject,
    html: wrapEmailHtml("תודה על ההזמנה", body, `הזמנה ${o.orderNumber} התקבלה בהצלחה`),
    attachments: pdf
      ? [{ filename: pdf.filename, content: pdf.bytes, contentType: "application/pdf" }]
      : undefined,
  });

  if (result.ok) {
    await markCustomerConfirmationEmailSent(
      orderId,
      {
        recipient: to,
        filename: pdf?.filename,
        provider: result.provider,
        messageId: result.messageId,
        manual: opts.manual === true ? true : undefined,
      },
      opts.adminUserId ?? "system",
    );
    return true;
  }
  await markOrderEmailFailed(
    orderId,
    `customer_confirmation_failed:${result.errorCode ?? "PROVIDER_ERROR"}:${(result.errorMessage ?? "").slice(0, 200)}`,
  );
  return false;
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

export async function sendOrderPaidAdminEmail(orderId: string): Promise<boolean> {
  if (await wasOwnerPaidEmailSent(orderId)) return true;
  const to = adminReceiver();
  if (!to) {
    console.warn("[email] skipped order_paid reason=missing_receiver", orderId);
    return false;
  }
  const payload = await loadOrderEmailPayload(orderId);
  if (!payload) return false;
  const extra = `${infoRow("אמצעי תשלום", escapeHtml(paymentProviderLabel(payload.payment?.provider)))}${infoRow(
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
  if (ok) {
    await markOwnerPaidEmailSent(orderId);
    return true;
  }
  await markOrderEmailFailed(orderId, "owner_paid_email_failed");
  return false;
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
