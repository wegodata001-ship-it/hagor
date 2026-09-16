import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Enrich a set of order-item snapshots with the CURRENT per-language names
 * from their linked Product rows so the PDF renderer can pick `name_ar` /
 * `name_he` / `name_en` based on the PDF language.
 *
 * We NEVER translate on the fly, and we NEVER mutate the underlying order
 * items — this is a read-only lookup that falls back gracefully when the
 * source product has been deleted or a translation is missing.
 */

// Match the shape the caller has selected via Prisma. Loose to accommodate
// both the order-confirmation and invoice pipelines without a shared type.
type ItemSnapshot<T extends object> = T & {
  productId: string | null;
  productName: string;
};

type LocalizedItem<T> = T & {
  productNameHe: string | null;
  productNameAr: string | null;
  productNameEn: string | null;
};

export async function attachLocalizedProductNames<T extends object>(
  storeId: string,
  items: ItemSnapshot<T>[],
): Promise<LocalizedItem<T>[]> {
  const productIds = Array.from(
    new Set(items.map((i) => i.productId).filter((id): id is string => !!id)),
  );

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, storeId },
        select: { id: true, name_he: true, name_ar: true, name_en: true },
      })
    : [];
  const map = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => {
    const p = item.productId ? map.get(item.productId) : undefined;
    return {
      ...item,
      productNameHe: (p?.name_he ?? null) || item.productName || null,
      productNameAr: p?.name_ar ?? null,
      productNameEn: p?.name_en ?? null,
    } as LocalizedItem<T>;
  });
}
