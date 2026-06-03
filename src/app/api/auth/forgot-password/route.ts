import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getAppUrl } from "@/lib/app-url";
import { queueEmail, sendPasswordResetEmail } from "@/lib/email/email-service";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
  }

  const storeId = STORE_ID;
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { storeId, email, role: UserRole.CUSTOMER },
    select: { id: true, name: true, email: true },
  });

  // Always OK — do not reveal if email exists
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = randomUUID();
  await prisma.passwordResetToken.create({
    data: {
      storeId,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  queueEmail(() =>
    sendPasswordResetEmail({
      name: user.name ?? "לקוח",
      email: user.email,
      resetUrl,
    }),
  );

  return NextResponse.json({ ok: true });
}
