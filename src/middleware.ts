import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  const token = req.cookies.get("session")?.value;
  const session = token ? await decodeSessionToken(token) : null;
  if (!session) {
    return NextResponse.redirect(new URL("/login-admin", req.url));
  }
  if (session.role !== "STORE_OWNER" && session.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
