import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthDebugLogsEnabled, SESSION_COOKIE_NAME } from "@/lib/auth/cookie-constants";
import {
  isAdminUiPath,
  isLooseDevHostname,
  isPaymentPublicPath,
  isPortalAllowedPath,
  isPortalHostname,
  isStoreHostname,
  normalizeHostname,
  portalOrigin,
  storeOrigin,
} from "@/lib/host";

export async function middleware(req: NextRequest) {
  // Keep middleware Edge-safe: no env secrets, no cookie decryption, no session validation.
  // Admin authorization remains enforced in Node (admin layout + server actions/routes).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-path", req.nextUrl.pathname);
  const existingTrace = req.headers.get("x-trace-id");
  requestHeaders.set(
    "x-trace-id",
    existingTrace && existingTrace.length > 0 ? existingTrace : crypto.randomUUID(),
  );

  const hostname = normalizeHostname(
    req.headers.get("x-forwarded-host") || req.headers.get("host"),
  );
  const { pathname, search } = req.nextUrl;
  const loose = isLooseDevHostname(hostname);

  // --- portal.hagourbywael.com → Admin only ---
  if (isPortalHostname(hostname)) {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (isPortalAllowedPath(pathname)) {
      if (isAuthDebugLogsEnabled() && isAdminUiPath(pathname)) {
        const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        console.log(
          JSON.stringify({
            scope: "auth",
            message: "middleware_portal_admin",
            path: pathname,
            cookieName: SESSION_COOKIE_NAME,
            hasCookie: !!cookieValue,
          }),
        );
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Non-admin paths on portal → public storefront
    return NextResponse.redirect(new URL(`${pathname}${search}`, storeOrigin()), 308);
  }

  // --- Public store host ---
  if (!loose && isStoreHostname(hostname)) {
    // www → apex (keep payment paths intact)
    if (hostname === "www.hagourbywael.com") {
      return NextResponse.redirect(new URL(`${pathname}${search}`, storeOrigin()), 308);
    }

    if (isAdminUiPath(pathname) && !isPaymentPublicPath(pathname)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, portalOrigin()), 308);
    }
  }

  if (isAuthDebugLogsEnabled()) {
    const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (isAdminUiPath(pathname)) {
      console.log(
        JSON.stringify({
          scope: "auth",
          message: "middleware_cookie_check",
          path: pathname,
          host: hostname,
          cookieName: SESSION_COOKIE_NAME,
          hasCookie: !!cookieValue,
          cookieLength: cookieValue?.length ?? 0,
        }),
      );
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
