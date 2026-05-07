import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminDashboardClient } from "@/components/admin/dashboard-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminSession();
  const storeId = getStoreId();

  const now = new Date();
  const start14 = new Date(now);
  start14.setDate(start14.getDate() - 13);
  start14.setHours(0, 0, 0, 0);

  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    ordersCount,
    revenueAgg,
    customers,
    productsCount,
    membersCount,
    recent,
    paid14,
    revenueThisMonth,
    revenuePrevMonth,
    lowStock,
  ] = await Promise.all([
    prisma.order.count({ where: { storeId } }),
    prisma.order.aggregate({
      where: { storeId, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.customerProfile.count({ where: { storeId } }),
    prisma.product.count({ where: { storeId } }),
    prisma.customerMembership.count({
      where: {
        plan: { storeId },
        active: true,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
    }),
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
    prisma.order.findMany({
      where: { storeId, paymentStatus: "PAID", createdAt: { gte: start14 } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.aggregate({
      where: { storeId, paymentStatus: "PAID", createdAt: { gte: startThisMonth } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        storeId,
        paymentStatus: "PAID",
        createdAt: { gte: startPrevMonth, lt: endPrevMonth },
      },
      _sum: { total: true },
    }),
    prisma.product.findMany({
      where: { storeId, active: true, stock: { lt: 5 } },
      orderBy: { stock: "asc" },
      take: 8,
      select: { id: true, name_he: true, name_ar: true, name_en: true, stock: true, sku: true },
    }),
  ]);

  const revenue = Number(revenueAgg._sum.total ?? 0);
  const revThis = Number(revenueThisMonth._sum.total ?? 0);
  const revPrev = Number(revenuePrevMonth._sum.total ?? 0);
  const growth = revPrev > 0 ? Math.round(((revThis - revPrev) / revPrev) * 1000) / 10 : null;

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const buckets = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start14);
    d.setDate(d.getDate() + i);
    const k = dayKey(d);
    buckets.set(k, { date: k, revenue: 0, orders: 0 });
  }
  for (const o of paid14) {
    const k = dayKey(o.createdAt);
    const b = buckets.get(k);
    if (!b) continue;
    b.revenue += Number(o.total);
    b.orders += 1;
  }
  const chart = Array.from(buckets.values()).map((x) => ({
    date: x.date,
    revenue: Math.round(x.revenue * 100) / 100,
    orders: x.orders,
  }));

  return (
    <AdminDashboardClient
      totals={{
        ordersCount,
        revenuePaid: revenue,
        customersCount: customers,
        productsCount,
        membersCount,
        monthlyGrowthPct: growth,
      }}
      chart={chart}
      lowStock={lowStock.map((p) => ({
        id: p.id,
        name_he: p.name_he,
        name_ar: p.name_ar,
        name_en: p.name_en,
        stock: p.stock,
        sku: p.sku,
      }))}
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
