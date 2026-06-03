/** Server: demo payment API allowed (never rely on NEXT_PUBLIC alone). */
export function isDemoPaymentAllowed(): boolean {
  return process.env.ALLOW_DEMO_PAYMENT === "true";
}

/** Client bundle: show demo payment UI (checkout / payment page). */
export function isClientDemoPaymentUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENT === "true";
}

/**
 * Whether storefront may offer demo payment controls.
 * On the server uses ALLOW_DEMO_PAYMENT; in the browser only NEXT_PUBLIC is available.
 */
export function isPublicDemoPaymentAllowed(): boolean {
  if (typeof window === "undefined") {
    return isDemoPaymentAllowed();
  }
  return isClientDemoPaymentUiEnabled();
}
