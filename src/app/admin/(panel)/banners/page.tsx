import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import type { BannerDTO } from "@/components/admin/banners-admin-client";
import { BannersAdminClient } from "@/components/admin/banners-admin-client";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdminSession();
  const storeId = getStoreId();
  const serialized = await safeQuery(
    "admin.banners",
    async () => {
      const banners = await prisma.banner.findMany({
        where: { storeId },
        orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }],
      });
      return JSON.parse(JSON.stringify(banners)) as BannerDTO[];
    },
    [] as BannerDTO[],
    { timeoutMs: 25_000 },
  );

  return <BannersAdminClient banners={serialized} />;
}
