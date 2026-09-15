import {
  queueEmail,
  sendOrderConfirmationEmail,
  sendOrderCreatedEmail,
  sendOrderPaidAdminEmail,
} from "@/lib/email/email-service";
import { buildWhatsAppUrl } from "./whatsapp";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

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
    select: { whatsappPhone: true },
  });
}

/** After checkout — notify store owner (email + WhatsApp). */
export async function notifyNewOrderToOwner(payload: OrderNotificationPayload): Promise<void> {
  queueEmail(() => sendOrderCreatedEmail(payload.orderId));

  const settings = await storeContacts();
  const msg = `הזמנה חדשה ${payload.orderNumber ?? ""}\nלקוח: ${payload.customerName}\nטלפון: ${payload.customerPhone ?? "—"}\nסכום: ₪${payload.total.toFixed(2)}`;
  if (settings?.whatsappPhone) {
    const url = buildWhatsAppUrl(settings.whatsappPhone, msg);
    if (url && process.env.NODE_ENV === "development") {
      console.info("[HAGOUR WhatsApp owner]", url);
    }
  }
}

/**
 * After verified payment — customer confirmation.
 * Awaited on the payment settlement path so Vercel does not freeze before SMTP completes.
 */
export async function notifyOrderConfirmationToCustomer(
  payload: OrderNotificationPayload,
): Promise<boolean> {
  try {
    return await sendOrderConfirmationEmail(payload.orderId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] EMAIL_FAILED customer_confirmation", payload.orderId, message.slice(0, 400));
    return false;
  }
}

/** After payment — owner paid notification (awaited; never throws to caller). */
export async function notifyOrderPaidToOwner(payload: OrderNotificationPayload): Promise<boolean> {
  try {
    const ok = await sendOrderPaidAdminEmail(payload.orderId);
    const settings = await storeContacts();
    const msg = `תשלום התקבל ✅\n${payload.orderNumber}\n${payload.customerName}\n₪${payload.total.toFixed(2)}`;
    if (settings?.whatsappPhone) {
      buildWhatsAppUrl(settings.whatsappPhone, msg);
    }
    return ok;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] EMAIL_FAILED owner_paid", payload.orderId, message.slice(0, 400));
    return false;
  }
}

/** Failed payment alert — optional admin email via order created channel. */
export async function notifyPaymentFailedToOwner(payload: OrderNotificationPayload): Promise<void> {
  void payload;
}
