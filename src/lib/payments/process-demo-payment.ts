import "server-only";

import { OrderPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { isDemoPaymentAllowed } from "./demo-guard";
import { isOrderPaymentSettled } from "./order-settled";
import { processPaymentWebhook } from "./process-webhook";

export const DEMO_PAYMENT_PROVIDER = "DEMO";

/** Marks order PAID + DEMO_PAID, records payment, reduces inventory, sends emails. */
export async function completeDemoPayment(orderId: string): Promise<{ ok: boolean; message: string }> {
  if (!isDemoPaymentAllowed()) {
    return { ok: false, message: "תשלום דמו אינו פעיל במערכת." };
  }

  const storeId = STORE_ID;
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { id: true, total: true, paymentStatus: true, status: true },
  });
  if (!order) {
    return { ok: false, message: "לא נמצאה הזמנה תקינה לתשלום." };
  }

  if (isOrderPaymentSettled(order.paymentStatus, order.status)) {
    return { ok: true, message: "Already paid" };
  }

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  const currency = settings?.currency ?? "ILS";

  return processPaymentWebhook({
    provider: DEMO_PAYMENT_PROVIDER,
    orderId: order.id,
    amount: Number(order.total),
    currency,
    success: true,
    transactionId: `demo-${order.id}-${Date.now()}`,
    confirmationNumber: `DEMO-${Date.now()}`,
    rawPayload: { demoPayment: true },
    orderPaymentStatus: OrderPaymentStatus.DEMO_PAID,
    paymentRecordStatus: "SUCCESS",
  });
}
