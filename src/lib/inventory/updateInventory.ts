import "server-only";

import { OrderPaymentStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

/**
 * Decrease inventory ONLY after verified payment success (order is PAID).
 * Safe against double-processing via `order.inventoryReducedAt`.
 */
export async function reduceInventoryAfterPayment(orderId: string): Promise<{ ok: boolean; message: string }> {
  const storeId = STORE_ID;
  try {
    await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, storeId },
          include: { items: true },
        });
        if (!order) throw new Error("Order not found");
        if (order.paymentStatus !== OrderPaymentStatus.PAID || order.status !== OrderStatus.PAID) {
          throw new Error("Order is not paid");
        }
        if (order.inventoryReducedAt) return; // already reduced

        // Validate & decrement atomically. If any line fails, the transaction rolls back.
        for (const item of order.items) {
          const optionIds = Array.from(new Set((item.variantOptionIds ?? []).map(String))).filter(Boolean);
          if (optionIds.length > 0) {
            // Decrement managed variant options (stock != null)
            const opts = await tx.productVariantOption.findMany({
              where: { id: { in: optionIds }, group: { productId: item.productId } },
              select: { id: true, stock: true },
            });
            const managed = opts.filter((o) => o.stock != null).map((o) => o.id);
            if (managed.length === 0) {
              // fallback to product stock if variants aren't managed
              const u = await tx.product.updateMany({
                where: { id: item.productId, storeId, stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } },
              });
              if (u.count !== 1) throw new Error("אין מספיק מלאי");
            } else {
              for (const id of managed) {
                const u = await tx.productVariantOption.updateMany({
                  where: { id, stock: { gte: item.quantity } },
                  data: { stock: { decrement: item.quantity } },
                });
                if (u.count !== 1) throw new Error("אין מספיק מלאי");
              }
            }
          } else {
            const u = await tx.product.updateMany({
              where: { id: item.productId, storeId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (u.count !== 1) throw new Error("אין מספיק מלאי");
          }
        }

        await tx.order.updateMany({
          where: { id: orderId, storeId },
          data: { inventoryReducedAt: new Date(), inventoryError: null },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 },
    );
    return { ok: true, message: "Inventory reduced" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Inventory error";
    await prisma.order.updateMany({
      where: { id: orderId, storeId },
      data: { inventoryError: msg },
    });
    return { ok: false, message: msg };
  }
}

/** Restore inventory only if it was reduced before (inventoryReducedAt != null). */
export async function restoreInventoryAfterCancel(orderId: string): Promise<{ ok: boolean; message: string }> {
  const storeId = STORE_ID;
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, storeId },
        include: { items: true },
      });
      if (!order) throw new Error("Order not found");
      if (!order.inventoryReducedAt) return;

      for (const item of order.items) {
        const optionIds = Array.from(new Set((item.variantOptionIds ?? []).map(String))).filter(Boolean);
        if (optionIds.length > 0) {
          await tx.productVariantOption.updateMany({
            where: { id: { in: optionIds }, stock: { not: null } },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.updateMany({
            where: { id: item.productId, storeId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.order.updateMany({
        where: { id: orderId, storeId },
        data: { inventoryReducedAt: null },
      });
    });
    return { ok: true, message: "Inventory restored" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Restore error";
    return { ok: false, message: msg };
  }
}

