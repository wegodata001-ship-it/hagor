import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import type { CouponDTO } from "@/components/admin/coupons-admin-client";
import { CouponsAdminClient } from "@/components/admin/coupons-admin-client";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdminSession();
  const storeId = getStoreId();
  const serialized: CouponDTO[] = await safeQuery(
    "admin.coupons",
    async () => {
      const coupons = await prisma.coupon.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
      });

      return coupons.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: Number(c.value),
        minOrderAmount: c.minOrderAmount != null ? Number(c.minOrderAmount) : null,
        usageLimit: c.usageLimit,
        active: c.active,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      }));
    },
    [],
    { timeoutMs: 25_000 },
  );

  return <CouponsAdminClient coupons={serialized} />;
}
