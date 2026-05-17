import { prisma } from "@/lib/prisma";
import { getSiteBaseUrl } from "@/lib/payments/config";
import { STORE_ID } from "@/lib/store";
import { sendResendEmail } from "@/lib/email/resend";
import { buildWhatsAppUrl } from "./whatsapp";

export type OrderNotificationPayload = {
  orderId: string;
  orderNumber: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  currency: string;
};

async function storeContacts() {
  return prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: { whatsappPhone: true, supportEmail: true },
  });
}

function orderEmailHtml(payload: OrderNotificationPayload, title: string, body: string) {
  const track = `${getSiteBaseUrl()}/account/orders`;
  return `
    <motionSafe style="font-family:Arial,sans-serif;background:#0b0b0b;color:#f5f5f4;padding:24px">
      <motionSafe style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:24px">
        <h1 style="color:#c89211;margin:0 0 12px;font-size:22px">${title}</h1>
        <p style="line-height:1.6;color:#d4d4d8">${body}</p>
        <p style="margin-top:16px"><strong>הזמנה:</strong> ${payload.orderNumber ?? payload.orderId}</p>
        <p><strong>סכום:</strong> ₪${payload.total.toFixed(2)} ${payload.currency}</p>
        <p style="margin-top:20px"><a href="${track}" style="color:#c89211">מעקב הזמנה</a></p>
      </motionSafe>
    </motionSafe>
  `.replace(/motionSafe/g, "div");
}

/** After checkout — notify store owner (email + WhatsApp link logged). */
export async function notifyNewOrderToOwner(payload: OrderNotificationPayload): Promise<void> {
  const settings = await storeContacts();
  const ownerEmail = settings?.supportEmail ?? process.env.STORE_OWNER_EMAIL;
  const msg = `הזמנה חדשה ${payload.orderNumber ?? ""}\nלקוח: ${payload.customerName}\nטלפון: ${payload.customerPhone ?? "—"}\nסכום: ₪${payload.total.toFixed(2)}`;

  if (ownerEmail) {
    await sendResendEmail({
      to: ownerEmail,
      subject: `[HAGOR] הזמנה חדשה ${payload.orderNumber ?? ""}`,
      html: orderEmailHtml(payload, "הזמנה חדשה", `לקוח: ${payload.customerName}<br/>טלפון: ${payload.customerPhone ?? "—"}`),
    });
  }

  if (settings?.whatsappPhone) {
    const url = buildWhatsAppUrl(settings.whatsappPhone, msg);
    if (url && process.env.NODE_ENV === "development") {
      console.info("[HAGOR WhatsApp owner]", url);
    }
  }
}

/** After payment success — customer confirmation email. */
export async function notifyOrderConfirmationToCustomer(payload: OrderNotificationPayload): Promise<void> {
  await sendResendEmail({
    to: payload.customerEmail,
    subject: `HAGOR — אישור תשלום ${payload.orderNumber ?? ""}`,
    html: orderEmailHtml(
      payload,
      "תודה על ההזמנה",
      `שלום ${payload.customerName},<br/>התשלום אושר. אנחנו מכינים את ההזמנה שלך.`,
    ),
  });

  if (payload.customerPhone) {
    const customerMsg = `שלום ${payload.customerName}, תודה על ההזמנה ב-HAGOR!\nמספר הזמנה: ${payload.orderNumber}\nמעקב: ${getSiteBaseUrl()}/account/orders`;
    buildWhatsAppUrl(payload.customerPhone, customerMsg);
  }
}

/** After payment — owner paid notification. */
export async function notifyOrderPaidToOwner(payload: OrderNotificationPayload): Promise<void> {
  const settings = await storeContacts();
  const ownerEmail = settings?.supportEmail ?? process.env.STORE_OWNER_EMAIL;
  const msg = `תשלום התקבל ✅\n${payload.orderNumber}\n${payload.customerName}\n₪${payload.total.toFixed(2)}`;

  if (ownerEmail) {
    await sendResendEmail({
      to: ownerEmail,
      subject: `[HAGOR] תשלום התקבל ${payload.orderNumber ?? ""}`,
      html: orderEmailHtml(payload, "תשלום התקבל", `הזמנה שולמה בהצלחה.`),
    });
  }

  if (settings?.whatsappPhone) {
    buildWhatsAppUrl(settings.whatsappPhone, msg);
  }
}

/** Failed payment alert to owner. */
export async function notifyPaymentFailedToOwner(payload: OrderNotificationPayload): Promise<void> {
  const settings = await storeContacts();
  const ownerEmail = settings?.supportEmail ?? process.env.STORE_OWNER_EMAIL;
  if (!ownerEmail) return;
  await sendResendEmail({
    to: ownerEmail,
    subject: `[HAGOR] תשלום נכשל ${payload.orderNumber ?? ""}`,
    html: orderEmailHtml(payload, "תשלום נכשל", `נדרש מעקב ידני להזמנה.`),
  });
}
