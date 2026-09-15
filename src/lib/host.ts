/**
 * Host helpers — Edge-safe (usable from middleware).
 * Portal = admin; apex = public storefront. Hyp callbacks stay on the store host.
 */

export const PRODUCTION_SITE_HOST = "hagourbywael.com";
export const PRODUCTION_WWW_HOST = "www.hagourbywael.com";
export const PRODUCTION_PORTAL_HOST = "portal.hagourbywael.com";

export const PRODUCTION_SITE_URL = `https://${PRODUCTION_SITE_HOST}`;
export const PRODUCTION_PORTAL_URL = `https://${PRODUCTION_PORTAL_HOST}`;

export function normalizeHostname(hostHeader: string | null | undefined): string {
  return (hostHeader || "").split(",")[0]?.trim().split(":")[0]?.toLowerCase() || "";
}

export function isPortalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === PRODUCTION_PORTAL_HOST || h === "portal.localhost";
}

export function isStoreHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === PRODUCTION_SITE_HOST || h === PRODUCTION_WWW_HOST;
}

/** Local / preview hosts — do not force portal redirects. */
export function isLooseDevHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".vercel.app") ||
    h.endsWith(".localhost")
  );
}

export function storeOrigin(): string {
  return PRODUCTION_SITE_URL;
}

export function portalOrigin(): string {
  return PRODUCTION_PORTAL_URL;
}

/** Paths allowed on the portal host (admin surface + auth/upload helpers). */
export function isPortalAllowedPath(pathname: string): boolean {
  if (pathname === "/login-admin" || pathname.startsWith("/login-admin/")) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/upload")) return true;
  if (pathname === "/api/health") return true;
  return false;
}

/** Admin UI paths that must live on the portal (never on the public store host). */
export function isAdminUiPath(pathname: string): boolean {
  return (
    pathname === "/login-admin" ||
    pathname.startsWith("/login-admin/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

/** Payment / Hyp public callbacks — never redirect off the store host. */
export function isPaymentPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/payments/") ||
    pathname.startsWith("/api/webhooks/payment") ||
    pathname === "/payment/success" ||
    pathname === "/payment/failed" ||
    pathname.startsWith("/payment/success") ||
    pathname.startsWith("/payment/failed")
  );
}
