import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { signSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const storeId = STORE_ID;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login" }, { status: 400 });
  }

  let user:
    | {
        id: string;
        storeId: string | null;
        role: "CUSTOMER" | "STORE_OWNER" | "SUPER_ADMIN";
        password: string;
        emailVerified: boolean;
      }
    | null = null;
  try {
    user = await prisma.user.findFirst({
      where: { storeId, email: parsed.data.email.toLowerCase() },
      select: {
        id: true,
        storeId: true,
        role: true,
        password: true,
        emailVerified: true,
      },
    });
  } catch (e) {
    // This shows up in Vercel runtime logs and helps diagnose DATABASE_URL / Prisma issues.
    console.error("login: prisma error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  let ok = false;
  try {
    ok = await bcrypt.compare(parsed.data.password, user.password);
  } catch (e) {
    console.error("login: bcrypt compare error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (user.role === "CUSTOMER" && !user.emailVerified) {
    return NextResponse.json(
      { error: "Email not verified. Please verify your email first." },
      { status: 403 },
    );
  }

  try {
    const token = await signSession({
      userId: user.id,
      role: user.role,
      storeId: user.storeId,
    });
    await setSessionCookie(token);
  } catch (e) {
    console.error("login: session cookie error", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role: user.role });
}
