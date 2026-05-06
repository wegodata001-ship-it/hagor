import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { setSessionCookie, signSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/login?verified=0", req.url));
  }

  const storeId = STORE_ID;
  const now = new Date();
  const verification = await prisma.emailVerificationToken.findFirst({
    where: {
      storeId,
      token,
      usedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: {
        select: { id: true, role: true, storeId: true },
      },
    },
  });

  if (!verification || !verification.user) {
    return NextResponse.redirect(new URL("/login?verified=0", req.url));
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: verification.userId, storeId },
      data: {
        emailVerified: true,
        emailVerifiedAt: now,
      },
    });
    await tx.emailVerificationToken.updateMany({
      where: { storeId, userId: verification.userId, usedAt: null },
      data: { usedAt: now },
    });
  });

  const sessionToken = await signSession({
    userId: verification.user.id,
    role: verification.user.role,
    storeId: verification.user.storeId,
  });
  await setSessionCookie(sessionToken);
  return NextResponse.redirect(new URL("/account?verified=1", req.url));
}
