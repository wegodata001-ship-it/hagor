import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthDebugLogsEnabled, SESSION_COOKIE_NAME } from "@/lib/auth/cookie-constants";

export async function middleware(req: NextRequest) {
  // Keep middleware Edge-safe: no env secrets, no cookie decryption, no session validation.
  // Admin protection is enforced in Node runtime (admin layout + server actions/routes).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-path", req.nextUrl.pathname);
  const existingTrace = req.headers.get("x-trace-id");
  requestHeaders.set("x-trace-id", existingTrace && existingTrace.length > 0 ? existingTrace : crypto.randomUUID());

  if (isAuthDebugLogsEnabled()) {
    const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/login-admin")) {
      console.log(
        JSON.stringify({
          scope: "auth",
          message: "middleware_cookie_check",
          path: req.nextUrl.pathname,
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
    /*
     * Attach pathname for structured logging in Server Components / Route Handlers.
     * Skip static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
