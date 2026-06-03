import { OrderPaymentStatus, OrderStatus } from "@prisma/client";

export function isOrderPaymentSettled(
  paymentStatus: OrderPaymentStatus,
  status: OrderStatus,
): boolean {
  return (
    status === OrderStatus.PAID &&
    (paymentStatus === OrderPaymentStatus.PAID ||
      paymentStatus === OrderPaymentStatus.TEST_PAID ||
      paymentStatus === OrderPaymentStatus.DEMO_PAID)
  );
}
