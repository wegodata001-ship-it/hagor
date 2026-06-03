import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { strongPasswordRegex } from "@/lib/password-strength";

export const runtime = "nodejs";

const Schema = z.object({
  token: z.string().min(1),
  password: z.string().regex(strongPasswordRegex, "סיסמה חלשה מדי"),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" },
      { status: 400 },
    );
  }

  const storeId = STORE_ID;
  const row = await prisma.passwordResetToken.findFirst({
    where: {
      storeId,
      token: parsed.data.token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "קישור לא תקף או שפג תוקפו" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: row.userId, storeId },
      data: { password: hash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { id: row.id, storeId },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
