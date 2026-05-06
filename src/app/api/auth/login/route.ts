import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { signSession, setSessionCookie } from "@/lib/auth/session";

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

  const user = await prisma.user.findFirst({
    where: { storeId, email: parsed.data.email.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(parsed.data.password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (user.role === "CUSTOMER" && !user.emailVerified) {
    return NextResponse.json(
      { error: "Email not verified. Please verify your email first." },
      { status: 403 },
    );
  }

  const token = await signSession({
    userId: user.id,
    role: user.role,
    storeId: user.storeId,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, role: user.role });
}
