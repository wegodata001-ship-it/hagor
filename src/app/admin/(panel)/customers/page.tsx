import { requireAdminSession } from "@/lib/admin-auth";
import { getStoreId } from "@/lib/store-config";
import { prisma } from "@/lib/prisma";
import { CustomersAdminClient, type CustomerRow } from "@/components/admin/customers-admin-client";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  await requireAdminSession();
  const storeId = getStoreId();
  const sp = (await searchParams) ?? {};
  const filter = (sp.filter ?? "").toLowerCase();

  const now = new Date();
  const rows: CustomerRow[] = await safeQuery(
    "admin.customers",
    async () => {
      const customers = await prisma.customerProfile.findMany({
        where: {
          storeId,
          ...(filter === "members"
            ? {
                memberships: {
                  some: { active: true, OR: [{ endDate: null }, { endDate: { gt: now } }] },
                },
              }
            : filter === "expired"
              ? {
                  memberships: {
                    some: { active: true, endDate: { lte: now } },
                  },
                }
              : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: {
          user: true,
          memberships: {
            orderBy: { createdAt: "desc" },
            include: { plan: true },
          },
        },
      });

      return customers.map((c) => {
        const active = c.memberships.find((m) => m.active && (!m.endDate || m.endDate > now)) ?? null;
        const expired = c.memberships.find((m) => m.active && !!m.endDate && m.endDate <= now) ?? null;
        return {
          id: c.id,
          name: c.user?.name ?? "—",
          email: c.user?.email ?? "—",
          phone: c.phone ?? null,
          pointsBalance: c.pointsBalance,
          membershipBadge: c.membershipBadge ?? null,
          membershipPlan: active?.plan?.name ?? null,
          membershipEndsAt: active?.endDate ? active.endDate.toISOString() : null,
          hasExpiredMembership: !!expired && !active,
          createdAt: c.createdAt.toISOString(),
        };
      });
    },
    [],
    { timeoutMs: 25_000 },
  );

  return <CustomersAdminClient rows={rows} filter={filter} />;
}

