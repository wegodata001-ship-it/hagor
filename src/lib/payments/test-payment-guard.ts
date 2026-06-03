/** Internal test checkout — never enable in public production without explicit env. */
export function isTestPaymentAllowed(): boolean {
  return process.env.ALLOW_TEST_PAYMENT === "true";
}

/** Client-visible test payment (both server + public flags required). */
export function isPublicTestPaymentAllowed(): boolean {
  return (
    process.env.NEXT_PUBLIC_ALLOW_TEST_PAYMENT === "true" && isTestPaymentAllowed()
  );
}
