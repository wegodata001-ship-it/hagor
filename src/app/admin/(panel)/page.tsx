import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminDashboardClient } from "@/components/admin/dashboard-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminSession();
  const storeId = getStoreId();

  const [ordersCount, revenueAgg, customers, productsCount, recent] = await Promise.all([
    prisma.order.count({ where: { storeId } }),
    prisma.order.aggregate({
      where: { storeId, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.customerProfile.count({ where: { storeId } }),
    prisma.product.count({ where: { storeId } }),
    prisma.order.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
  ]);

  const revenue = Number(revenueAgg._sum.total ?? 0);

  return (
    <AdminDashboardClient
      totals={{
        ordersCount,
        revenuePaid: revenue,
        customersCount: customers,
        productsCount,
      }}
      recent={recent.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: Number(o.total),
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
      }))}
      quick={{
        addProductHref: "/admin/products?add=1",
        addCategoryHref: "/admin/categories",
        addBannerHref: "/admin/banners",
      }}
    />
  );
}
