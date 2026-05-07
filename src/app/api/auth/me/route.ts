import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const storeId = STORE_ID;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, storeId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      acceptedTermsAt: true,
      customerProfile: {
        select: { id: true, pointsBalance: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      acceptedTermsAt: user.acceptedTermsAt?.toISOString() ?? null,
      pointsBalance: user.customerProfile?.pointsBalance ?? null,
      customerProfileId: user.customerProfile?.id ?? null,
    },
  });
}
