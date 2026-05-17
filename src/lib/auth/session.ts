import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";
import { isAuthDebugLogsEnabled, SESSION_COOKIE_NAME } from "@/lib/auth/cookie-constants";

function sessionCookieAttributes(maxAgeSec: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}

export type SessionPayload = {
  userId: string;
  role: UserRole;
  storeId: string | null;
};

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (min 16 chars)");
  return new TextEncoder().encode(s);
}

export async function signSession(
  payload: SessionPayload,
  opts?: { expiresIn?: string },
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(opts?.expiresIn ?? "7d")
    .sign(secretKey());
}

export async function decodeSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = payload.userId as string | undefined;
    const role = payload.role as UserRole | undefined;
    const storeId = (payload.storeId as string | null | undefined) ?? null;
    if (!userId || !role) return null;
    return { userId, role, storeId };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    if (isAuthDebugLogsEnabled()) {
      console.log(
        JSON.stringify({
          scope: "auth",
          message: "session_cookie_missing",
          cookieName: SESSION_COOKIE_NAME,
        }),
      );
    }
    return null;
  }
  const decoded = await decodeSessionToken(raw);
  if (isAuthDebugLogsEnabled()) {
    console.log(
      JSON.stringify({
        scope: "auth",
        message: "session_decoded",
        cookieName: SESSION_COOKIE_NAME,
        hasSession: !!decoded,
        role: decoded?.role ?? null,
        storeId: decoded?.storeId ?? null,
        userId: decoded?.userId ?? null,
      }),
    );
  }
  return decoded;
}

export async function setSessionCookie(token: string, opts?: { maxAgeSec?: number }) {
  const jar = await cookies();
  const maxAge = opts?.maxAgeSec ?? 60 * 60 * 24 * 7;
  jar.set(SESSION_COOKIE_NAME, token, sessionCookieAttributes(maxAge));
  if (isAuthDebugLogsEnabled()) {
    console.log(
      JSON.stringify({
        scope: "auth",
        message: "session_cookie_set_on_jar",
        cookieName: SESSION_COOKIE_NAME,
        ...sessionCookieAttributes(maxAge),
        domain: null,
      }),
    );
  }
}

/** Prefer this in Route Handlers so `Set-Cookie` is guaranteed on the outgoing HTTP response. */
export function applySessionCookieToResponse(res: NextResponse, token: string, opts?: { maxAgeSec?: number }) {
  const maxAge = opts?.maxAgeSec ?? 60 * 60 * 24 * 7;
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieAttributes(maxAge));
  if (isAuthDebugLogsEnabled()) {
    console.log(
      JSON.stringify({
        scope: "auth",
        message: "session_cookie_set_on_response",
        cookieName: SESSION_COOKIE_NAME,
        ...sessionCookieAttributes(maxAge),
        domain: null,
      }),
    );
  }
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function clearSessionCookieOnResponse(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
