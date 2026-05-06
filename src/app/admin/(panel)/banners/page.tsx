import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import type { BannerDTO } from "@/components/admin/banners-admin-client";
import { BannersAdminClient } from "@/components/admin/banners-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdminSession();
  const storeId = getStoreId();
  const banners = await prisma.banner.findMany({
    where: { storeId },
    orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }],
  });

  const serialized = JSON.parse(JSON.stringify(banners)) as BannerDTO[];

  return <BannersAdminClient banners={serialized} />;
}
