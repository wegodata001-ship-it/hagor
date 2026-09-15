/**
 * Demo payments are permanently disabled for HAGOR production.
 * Historical DEMO_PAID rows may still exist in the DB for audit — new demos cannot be created.
 * Env flags are ignored so a misconfigured ALLOW_DEMO_PAYMENT cannot re-enable this path.
 */
export function isDemoPaymentAllowed(): boolean {
  return false;
}

export function isClientDemoPaymentUiEnabled(): boolean {
  return false;
}

export function isPublicDemoPaymentAllowed(): boolean {
  return false;
}
