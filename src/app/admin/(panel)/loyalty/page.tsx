import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import type { LoyaltyRewardDTO, LoyaltySettingsDTO } from "@/components/admin/loyalty-admin-client";
import { LoyaltyAdminClient } from "@/components/admin/loyalty-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminLoyaltyPage() {
  await requireAdminSession();
  const storeId = getStoreId();

  const [settingsRow, rewards] = await Promise.all([
    prisma.loyaltySettings.findUnique({ where: { storeId } }),
    prisma.loyaltyReward.findMany({
      where: { storeId },
      orderBy: { requiredPoints: "asc" },
    }),
  ]);

  const ensured =
    settingsRow ??
    (await prisma.loyaltySettings.create({
      data: {
        storeId,
        enabled: true,
        pointsPerShekel: 1,
        minOrderForPoints: 0,
        pointsToIlsRate: 100,
        allowRedeem: true,
      },
    }));

  const settings: LoyaltySettingsDTO = {
    enabled: ensured.enabled,
    pointsPerShekel: Number(ensured.pointsPerShekel),
    minOrderForPoints: Number(ensured.minOrderForPoints),
    pointsToIlsRate: Number(ensured.pointsToIlsRate),
    allowRedeem: ensured.allowRedeem,
    pointsExpireDays: ensured.pointsExpireDays,
  };

  const rewardDtos: LoyaltyRewardDTO[] = rewards.map((r) => ({
    id: r.id,
    title_he: r.title_he,
    title_ar: r.title_ar,
    title_en: r.title_en,
    requiredPoints: r.requiredPoints,
    rewardType: r.rewardType,
    value: r.value,
    active: r.active,
  }));

  return <LoyaltyAdminClient settings={settings} rewards={rewardDtos} />;
}
