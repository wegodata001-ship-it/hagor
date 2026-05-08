import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

const COOKIE = "session";

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
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return decodeSessionToken(raw);
}

export async function setSessionCookie(token: string, opts?: { maxAgeSec?: number }) {
  const jar = await cookies();
  const maxAge = opts?.maxAgeSec ?? 60 * 60 * 24 * 7;
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
