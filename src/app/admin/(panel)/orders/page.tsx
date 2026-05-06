import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";
import type { OrderFilters, OrderRowDTO } from "@/components/admin/orders-admin-client";
import { OrdersAdminClient } from "@/components/admin/orders-admin-client";

export const dynamic = "force-dynamic";

function getStringParam(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const storeId = STORE_ID;
  const sp = (await searchParams) ?? {};

  const q = getStringParam(sp.q).trim();
  const status = getStringParam(sp.status).trim();
  const paymentStatus = getStringParam(sp.paymentStatus).trim();
  const deliveryType = getStringParam(sp.deliveryType).trim();
  const shippingArea = getStringParam(sp.shippingArea).trim();
  const from = getStringParam(sp.from).trim();
  const to = getStringParam(sp.to).trim();
  const minTotalRaw = getStringParam(sp.minTotal).trim();
  const maxTotalRaw = getStringParam(sp.maxTotal).trim();

  const where: Prisma.OrderWhereInput = { storeId };
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status && status !== "ALL") where.status = status as never;
  if (paymentStatus && paymentStatus !== "ALL") where.paymentStatus = paymentStatus as never;
  if (deliveryType && deliveryType !== "ALL") where.deliveryOptionType = deliveryType as never;
  if (shippingArea && shippingArea !== "ALL") where.deliveryOptionName = shippingArea;
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
  }
  if (minTotalRaw || maxTotalRaw) {
    where.total = {};
    if (minTotalRaw) {
      const n = Number(minTotalRaw);
      if (!Number.isNaN(n)) where.total.gte = n;
    }
    if (maxTotalRaw) {
      const n = Number(maxTotalRaw);
      if (!Number.isNaN(n)) where.total.lte = n;
    }
  }

  const shippingOptions = await prisma.deliveryOption.findMany({
    where: { storeId, type: "SHIPPING" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { name_he: true },
  });
  const shippingAreas = [...new Set(shippingOptions.map((o) => o.name_he).filter(Boolean))];

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      total: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      deliveryOptionName: true,
      deliveryOptionType: true,
      deliveryPrice: true,
    },
  });

  const rows: OrderRowDTO[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    total: Number(o.total),
    status: o.status,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt.toISOString(),
    deliveryOptionName: o.deliveryOptionName,
    deliveryOptionType: o.deliveryOptionType,
    deliveryPrice: Number(o.deliveryPrice),
  }));

  const initialFilters: OrderFilters = {
    q,
    status: status || "ALL",
    paymentStatus: paymentStatus || "ALL",
    deliveryType: deliveryType || "ALL",
    shippingArea: shippingArea || "ALL",
    from,
    to,
    minTotal: minTotalRaw,
    maxTotal: maxTotalRaw,
  };

  return (
    <OrdersAdminClient
      orders={rows}
      initialFilters={initialFilters}
      shippingAreas={shippingAreas}
    />
  );
}
