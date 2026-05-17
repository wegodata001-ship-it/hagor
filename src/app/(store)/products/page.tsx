import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { StoreProductsClient } from "@/components/storefront/store-products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string; q?: string; min?: string; max?: string; sort?: string }>;
}) {
  const storeId = getStoreId();
  const sp = (await searchParams) ?? {};
  const cat = sp.cat?.trim() || "";
  const q = sp.q?.trim() || "";
  const minPrice = Number(sp.min);
  const maxPrice = Number(sp.max);
  const sort = sp.sort?.trim() || "new";

  const categories = await prisma.category.findMany({
    where: { storeId, active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, parentId: true, name_he: true, name_ar: true, name_en: true, imageUrl: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c] as const));
  const selected = cat ? byId.get(cat) : null;
  const children = selected ? categories.filter((c) => c.parentId === selected.id) : [];

  const categoryIds =
    selected == null
      ? null
      : selected.parentId == null
        ? [selected.id, ...children.map((c) => c.id)]
        : [selected.id];

  const orderBy =
    sort === "price-asc"
      ? { price: "asc" as const }
      : sort === "price-desc"
        ? { price: "desc" as const }
        : { createdAt: "desc" as const };

  const priceFilter =
    Number.isFinite(minPrice) && minPrice > 0 && Number.isFinite(maxPrice) && maxPrice > 0
      ? { gte: minPrice, lte: maxPrice }
      : Number.isFinite(minPrice) && minPrice > 0
        ? { gte: minPrice }
        : Number.isFinite(maxPrice) && maxPrice > 0
          ? { lte: maxPrice }
          : undefined;

  const products = await prisma.product.findMany({
    where: {
      storeId,
      active: true,
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(q
        ? {
            OR: [
              { name_he: { contains: q, mode: "insensitive" } },
              { name_ar: { contains: q, mode: "insensitive" } },
              { name_en: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(priceFilter ? { price: priceFilter } : {}),
    },
    orderBy,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  const prices = products.map((p) => Number(p.price));
  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 9999;

  return (
    <Suspense fallback={<div className="min-h-[40vh] animate-pulse bg-zinc-900/20" />}>
      <StoreProductsClient
        categories={categories}
        selectedCategoryId={selected?.id ?? ""}
        priceMin={Math.floor(priceMin)}
        priceMax={Math.ceil(priceMax)}
        products={products.map((p) => ({
          id: p.id,
          name_he: p.name_he,
          name_ar: p.name_ar,
          name_en: p.name_en,
          description_he: p.description_he,
          description_ar: p.description_ar,
          description_en: p.description_en,
          price: Number(p.price),
          oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
          discountPercent: p.discountPercent ?? null,
          stock: p.stock,
          image: p.images[0]?.url ?? null,
        }))}
      />
    </Suspense>
  );
}
