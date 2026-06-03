import "server-only";

import { OrderPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { isOrderPaymentSettled } from "./order-settled";
import { isTestPaymentAllowed } from "./test-payment-guard";
import { processPaymentWebhook } from "./process-webhook";

export const TEST_PAYMENT_PROVIDER = "TEST_PAYMENT";

export { isOrderPaymentSettled };

/** Marks order PAID + TEST_PAID, records payment, reduces inventory. */
export async function completeTestPayment(orderId: string): Promise<{ ok: boolean; message: string }> {
  if (!isTestPaymentAllowed()) {
    return { ok: false, message: "Test payment is disabled" };
  }

  const storeId = STORE_ID;
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { id: true, total: true, paymentStatus: true, status: true },
  });
  if (!order) return { ok: false, message: "Order not found" };

  if (isOrderPaymentSettled(order.paymentStatus, order.status)) {
    return { ok: true, message: "Already paid" };
  }

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  const currency = settings?.currency ?? "ILS";

  return processPaymentWebhook({
    provider: TEST_PAYMENT_PROVIDER,
    orderId: order.id,
    amount: Number(order.total),
    currency,
    success: true,
    transactionId: `test-${order.id}-${Date.now()}`,
    confirmationNumber: `TEST-${Date.now()}`,
    rawPayload: { testPayment: true },
    orderPaymentStatus: OrderPaymentStatus.TEST_PAID,
    paymentRecordStatus: "TEST_PAID",
  });
}
