import type { OrderPaymentStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminDashboardClient } from "@/components/admin/dashboard-admin-client";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

const DASHBOARD_FALLBACK = {
  totals: {
    ordersCount: 0,
    revenuePaid: 0,
    customersCount: 0,
    productsCount: 0,
    membersCount: 0,
    monthlyGrowthPct: null as number | null,
    failedPaymentsCount: 0,
  },
  chart: [] as { date: string; revenue: number; orders: number }[],
  lowStock: [] as { id: string; name_he: string; name_ar: string; name_en: string; stock: number; sku: string }[],
  recent: [] as {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    createdAt: string;
  }[],
  quick: {
    addProductHref: "/admin/products?add=1",
    addCategoryHref: "/admin/categories",
    addBannerHref: "/admin/banners",
  },
};

async function loadAdminDashboardData(storeId: string) {
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
    failedPaymentsCount,
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
    prisma.order.count({
      where: { storeId, OR: [{ paymentStatus: "FAILED" }, { status: "FAILED" }] },
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

  return {
    totals: {
      ordersCount,
      revenuePaid: revenue,
      customersCount: customers,
      productsCount,
      membersCount,
      monthlyGrowthPct: growth,
      failedPaymentsCount,
    },
    chart,
    lowStock: lowStock.map((p) => ({
      id: p.id,
      name_he: p.name_he,
      name_ar: p.name_ar,
      name_en: p.name_en,
      stock: p.stock,
      sku: p.sku,
    })),
    recent: recent.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      total: Number(o.total),
      status: o.status as OrderStatus,
      paymentStatus: o.paymentStatus as OrderPaymentStatus,
      createdAt: o.createdAt.toISOString(),
    })),
    quick: DASHBOARD_FALLBACK.quick,
  };
}

export default async function AdminDashboardPage() {
  await requireAdminSession();
  const storeId = getStoreId();
  const data = await safeQuery("admin.dashboard", () => loadAdminDashboardData(storeId), DASHBOARD_FALLBACK, {
    timeoutMs: 25_000,
  });

  return (
    <AdminDashboardClient
      totals={data.totals}
      chart={data.chart}
      lowStock={data.lowStock}
      recent={data.recent}
      quick={data.quick}
    />
  );
}
