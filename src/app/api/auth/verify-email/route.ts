import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getAppUrl } from "@/lib/app-url";
import { queueEmail, sendWelcomeEmail } from "@/lib/email/email-service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const storeId = STORE_ID;
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  const base = getAppUrl();

  if (!token) {
    return NextResponse.redirect(new URL("/login?verify=invalid", base));
  }

  const row = await prisma.emailVerificationToken.findFirst({
    where: {
      storeId,
      token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!row) {
    return NextResponse.redirect(new URL("/login?verify=expired", base));
  }

  const user = await prisma.user.findFirst({
    where: { id: row.userId, storeId },
    select: { name: true, email: true },
  });

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: row.userId, storeId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.updateMany({
      where: { id: row.id, storeId },
      data: { usedAt: new Date() },
    }),
  ]);

  if (user?.email) {
    queueEmail(() =>
      sendWelcomeEmail({ name: user.name ?? "לקוח", email: user.email }),
    );
  }

  return NextResponse.redirect(new URL("/login?verify=ok", base));
}
