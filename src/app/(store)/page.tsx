import { prisma } from "@/lib/prisma";
import { loadApprovedReviews } from "@/lib/load-reviews";
import { getStoreId } from "@/lib/store-config";
import { StoreHomeClient } from "@/components/storefront/store-home-client";
import { safeQuery } from "@/lib/server/safe-query";
import { categoryKeyFromId } from "@/lib/tactical-placeholders";
import { resolveCategoryOptionProfile } from "@/lib/hagour-product-options";
import { filterHagourCategories, hagourCategoryIds, isHagourCategoryId } from "@/lib/hagour-catalog";
import { OrderPaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function loadHomeData(storeId: string) {
  const allowedCategoryIds = hagourCategoryIds(storeId);

  const [banners, categories, products, settings, salesRows] = await Promise.all([
    prisma.banner.findMany({
      where: { storeId, active: true, isHero: true },
      orderBy: [{ sortOrder: "asc" }],
      take: 1,
    }),
    prisma.category.findMany({
      where: { storeId, active: true, id: { in: allowedCategoryIds } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, parentId: true, name_he: true, name_ar: true, name_en: true, imageUrl: true },
    }),
    prisma.product.findMany({
      where: {
        storeId,
        active: true,
        categoryId: { in: allowedCategoryIds },
      },
      include: {
        category: {
          select: { id: true, name_he: true, name_ar: true, name_en: true },
        },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    prisma.storeSettings.findUnique({
      where: { storeId },
      select: {
        heroImageUrl: true,
        heroSubtitle_he: true,
        heroSubtitle_ar: true,
        heroSubtitle_en: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        storeId,
        productId: { not: null },
        order: {
          storeId,
          paymentStatus: {
            in: [OrderPaymentStatus.PAID, OrderPaymentStatus.TEST_PAID, OrderPaymentStatus.DEMO_PAID],
          },
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  const salesByProduct = new Map<string, number>();
  for (const row of salesRows) {
    if (!row.productId) continue;
    salesByProduct.set(row.productId, Number(row._sum.quantity ?? 0));
  }

  const reviews = await loadApprovedReviews(storeId);

  return {
    banners,
    categories: filterHagourCategories(categories),
    products: products.filter((p) => isHagourCategoryId(p.categoryId)),
    settings,
    reviews,
    salesByProduct,
  };
}

type HomeLoaded = Awaited<ReturnType<typeof loadHomeData>>;

export default async function HomePage() {
  const storeId = getStoreId();
  const emptySales = new Map<string, number>();
  const { banners, categories, products, settings, salesByProduct } = await safeQuery(
    "store.home",
    () => loadHomeData(storeId),
    {
      banners: [],
      categories: [],
      products: [],
      settings: null,
      reviews: [],
      salesByProduct: emptySales,
    } as HomeLoaded,
    { timeoutMs: 25_000 },
  );

  const reviews = await safeQuery(
    "store.home.reviews",
    () => loadApprovedReviews(storeId),
    [],
    { timeoutMs: 8_000 },
  );

  const toCard = (p: (typeof products)[number]) => ({
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
    categoryKey: categoryKeyFromId(p.categoryId),
    requiresOptions: !!resolveCategoryOptionProfile(undefined, p.categoryId),
    categoryId: p.categoryId,
    sku: p.sku,
    createdAt: p.createdAt.toISOString(),
    featured: p.featured,
    salesCount: salesByProduct.get(p.id) ?? 0,
    categoryName_he: p.category.name_he,
    categoryName_ar: p.category.name_ar,
    categoryName_en: p.category.name_en,
  });

  return (
    <StoreHomeClient
      heroImageUrl={settings?.heroImageUrl ?? null}
      heroCopy={
        settings
          ? {
              heroSubtitle_he: settings.heroSubtitle_he,
              heroSubtitle_ar: settings.heroSubtitle_ar,
              heroSubtitle_en: settings.heroSubtitle_en,
            }
          : null
      }
      banners={banners}
      categories={categories}
      products={products.map(toCard)}
      reviews={reviews.map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        imageUrl: r.imageUrl,
      }))}
    />
  );
}
