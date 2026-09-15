import "server-only";

/**
 * Test payment processor — permanently disabled.
 * Does not create Payment rows or change order status.
 */
export async function completeTestPayment(
  _orderId: string,
): Promise<{ ok: boolean; message: string }> {
  return {
    ok: false,
    message: "Test payment is permanently disabled. Use Hyp card payment.",
  };
}
