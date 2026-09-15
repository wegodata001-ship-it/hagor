import "server-only";

import { OrderPaymentStatus } from "@prisma/client";

/**
 * Demo payment processor — permanently disabled.
 * Does not create Payment rows or change order status.
 */
export const DEMO_PAYMENT_PROVIDER = "DEMO";

export async function completeDemoPayment(
  _orderId: string,
): Promise<{ ok: boolean; message: string }> {
  return {
    ok: false,
    message: "Demo payment is permanently disabled. Use Hyp card payment.",
  };
}

/** Kept so historical DEMO_PAID checks compile; never grant new demo settlement here. */
export function isHistoricalDemoPaid(status: OrderPaymentStatus | string): boolean {
  return status === OrderPaymentStatus.DEMO_PAID || status === "DEMO_PAID";
}
