import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Keep middleware Edge-safe: no env secrets, no cookie decryption, no session validation.
  // Admin protection is enforced in Node runtime (admin layout + server actions/routes).
  void req;
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
