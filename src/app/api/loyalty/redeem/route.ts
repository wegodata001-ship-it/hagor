import { NextResponse } from "next/server";
import { z } from "zod";
import { LoyaltyTransactionType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getSession } from "@/lib/auth/session";

const Schema = z.object({
  rewardId: z.string(),
  acceptTerms: z.boolean().optional(),
});

export async function POST(req: Request) {
  const storeId = STORE_ID;
  const session = await getSession();
  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, storeId },
    select: { id: true, acceptedTermsAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  if (!user.acceptedTermsAt && parsed.data.acceptTerms !== true) {
    return NextResponse.json(
      { error: "יש לאשר את התקנון ומדיניות הפרטיות למועדון הנאמנות" },
      { status: 400 },
    );
  }

  const reward = await prisma.loyaltyReward.findFirst({
    where: { id: parsed.data.rewardId, storeId, active: true },
  });
  if (!reward) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  const profile = await prisma.customerProfile.findFirst({
    where: { userId: session.userId, storeId },
  });
  if (!profile) {
    return NextResponse.json({ error: "No profile" }, { status: 400 });
  }
  if (profile.pointsBalance < reward.requiredPoints) {
    return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (!user.acceptedTermsAt && parsed.data.acceptTerms === true) {
      await tx.user.updateMany({
        where: { id: user.id, storeId },
        data: { acceptedTermsAt: new Date() },
      });
    }

    await tx.customerProfile.updateMany({
      where: { id: profile.id, storeId },
      data: { pointsBalance: { decrement: reward.requiredPoints } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        storeId,
        customerId: profile.id,
        type: LoyaltyTransactionType.REDEEM,
        points: reward.requiredPoints,
        reason: `Reward: ${reward.title_he}`,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    message: "הפרס מומש בהצלחה",
    hint: reward.value ? `ערך/קוד: ${reward.value}` : undefined,
  });
}
