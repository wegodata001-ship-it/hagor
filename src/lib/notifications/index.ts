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

/** After payment success — customer confirmation email. */
export async function notifyOrderConfirmationToCustomer(payload: OrderNotificationPayload): Promise<void> {
  queueEmail(() => sendOrderConfirmationEmail(payload.orderId));
}

/** After payment — owner paid notification. */
export async function notifyOrderPaidToOwner(payload: OrderNotificationPayload): Promise<void> {
  queueEmail(() => sendOrderPaidAdminEmail(payload.orderId));

  const settings = await storeContacts();
  const msg = `תשלום התקבל ✅\n${payload.orderNumber}\n${payload.customerName}\n₪${payload.total.toFixed(2)}`;
  if (settings?.whatsappPhone) {
    buildWhatsAppUrl(settings.whatsappPhone, msg);
  }
}

/** Failed payment alert — optional admin email via order created channel. */
export async function notifyPaymentFailedToOwner(payload: OrderNotificationPayload): Promise<void> {
  void payload;
}
