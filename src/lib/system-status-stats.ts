import "server-only";

import { prisma } from "@/lib/prisma";

/** Business counters for System Status — only fields that exist in DB. */
export type SystemStatusBusinessStats = {
  ordersToday: number;
  incompleteOrders: number;
  failedPayments: number;
  outOfStock: number;
  lowStock: number;
  paymentConfigured: boolean;
  checkedAt: string;
};

/** Matches admin dashboard low-stock rule: stock < 5. */
const LOW_STOCK_LT = 5;

export async function loadSystemStatusBusinessStats(
  storeId: string,
): Promise<SystemStatusBusinessStats> {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const [ordersToday, incompleteOrders, failedPayments, outOfStock, lowStock, settings] =
    await Promise.all([
      prisma.order.count({
        where: { storeId, createdAt: { gte: startToday } },
      }),
      prisma.order.count({
        where: {
          storeId,
          status: { notIn: ["CANCELLED", "FAILED"] },
          OR: [{ status: "PENDING" }, { paymentStatus: "UNPAID" }],
        },
      }),
      prisma.order.count({
        where: {
          storeId,
          OR: [{ paymentStatus: "FAILED" }, { status: "FAILED" }],
        },
      }),
      prisma.product.count({
        where: { storeId, active: true, stock: 0 },
      }),
      prisma.product.count({
        where: { storeId, active: true, stock: { gt: 0, lt: LOW_STOCK_LT } },
      }),
      prisma.storeSettings.findUnique({
        where: { storeId },
        select: { paymentProvider: true, paymentPublicKey: true },
      }),
    ]);

  const paymentConfigured = Boolean(
    settings?.paymentProvider?.trim() || settings?.paymentPublicKey?.trim(),
  );

  return {
    ordersToday,
    incompleteOrders,
    failedPayments,
    outOfStock,
    lowStock,
    paymentConfigured,
    checkedAt: new Date().toISOString(),
  };
}
