import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { StoreHomeClient } from "@/components/storefront/store-home-client";
import { safeQuery } from "@/lib/server/safe-query";
import { categoryKeyFromId } from "@/lib/tactical-placeholders";
import { resolveCategoryOptionProfile } from "@/lib/hagour-product-options";
import { filterHagourCategories, hagourCategoryIds, isHagourCategoryId } from "@/lib/hagour-catalog";

export const dynamic = "force-dynamic";

async function loadHomeData(storeId: string) {
  const allowedCategoryIds = hagourCategoryIds(storeId);

  const [banners, categories, products, settings] = await Promise.all([
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
      take: 24,
      include: {
        category: { select: { id: true } },
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
  ]);

  return {
    banners,
    categories: filterHagourCategories(categories),
    products: products.filter((p) => isHagourCategoryId(p.categoryId)),
    settings,
  };
}

type HomeLoaded = Awaited<ReturnType<typeof loadHomeData>>;

export default async function HomePage() {
  const storeId = getStoreId();
  const { banners, categories, products, settings } = await safeQuery(
    "store.home",
    () => loadHomeData(storeId),
    { banners: [], categories: [], products: [], settings: null } as HomeLoaded,
    { timeoutMs: 25_000 },
  );

  const featured = products.filter((p) => p.featured).slice(0, 8);
  const displayFeatured = featured.length > 0 ? featured : products.slice(0, 8);

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
      featured={displayFeatured.map(toCard)}
    />
  );
}
