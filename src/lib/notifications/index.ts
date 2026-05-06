/**
 * Notification hooks — implement with Resend/SendGrid/WhatsApp Business API later.
 */

export type OrderNotificationPayload = {
  orderId: string;
  orderNumber: string | null;
  customerEmail: string;
  customerName: string;
  total: number;
  currency: string;
};

/** Called after order is created (checkout). Optional WhatsApp link to owner. */
export async function notifyNewOrderToOwner(payload: OrderNotificationPayload): Promise<void> {
  void payload;
  // TODO: send WhatsApp template or click-to-chat link to StoreSettings.whatsappPhone
}

/** Called after payment succeeds (webhook). */
export async function notifyOrderConfirmationToCustomer(
  payload: OrderNotificationPayload,
): Promise<void> {
  void payload;
  // TODO: send email via transactional provider (Resend, etc.)
}

/** Called after payment succeeds — optional duplicate to owner. */
export async function notifyOrderPaidToOwner(payload: OrderNotificationPayload): Promise<void> {
  void payload;
  // TODO: email / WhatsApp to owner
}
