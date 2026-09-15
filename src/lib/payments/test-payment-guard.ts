/**
 * Internal test checkout bypass — permanently disabled.
 * Online PAID requires real Hyp VERIFY (or equivalent real provider webhook).
 */
export function isTestPaymentAllowed(): boolean {
  return false;
}

export function isPublicTestPaymentAllowed(): boolean {
  return false;
}
