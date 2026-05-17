import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { StoreHomeClient } from "@/components/storefront/store-home-client";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

async function loadHomeData(storeId: string) {
  const [banners, categories, products] = await Promise.all([
    prisma.banner.findMany({
      where: { storeId, active: true },
      orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.category.findMany({
      where: { storeId, active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, parentId: true, name_he: true, name_ar: true, name_en: true, imageUrl: true },
    }),
    prisma.product.findMany({
      where: { storeId, active: true },
      take: 60,
      include: {
        category: { select: { id: true, parentId: true, name_en: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  return { banners, categories, products };
}

type HomeLoaded = Awaited<ReturnType<typeof loadHomeData>>;

export default async function HomePage() {
  const storeId = getStoreId();
  const { banners, categories, products } = await safeQuery(
    "store.home",
    () => loadHomeData(storeId),
    { banners: [], categories: [], products: [] } as HomeLoaded,
    { timeoutMs: 25_000 },
  );

  const heroBanner = banners.find((b) => b.isHero) ?? null;
  const promoBanners = banners.filter((b) => !b.isHero);
  const featured = products.filter((p) => p.featured).slice(0, 12);
  const bestSellers = [...products].sort((a, b) => b.stock - a.stock).slice(0, 10);
  const newArrivals = [...products].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 8);

  const sectionIds = (rootName: string) => {
    const root = categories.find((c) => !c.parentId && c.name_en.toLowerCase() === rootName.toLowerCase());
    if (!root) return new Set<string>();
    const childIds = categories.filter((c) => c.parentId === root.id).map((c) => c.id);
    return new Set([root.id, ...childIds]);
  };

  const tacticalClothing = products.filter((p) => sectionIds("Tactical Clothing").has(p.categoryId)).slice(0, 8);
  const tacticalBoots = products.filter((p) => sectionIds("Tactical Boots").has(p.categoryId)).slice(0, 8);
  const protectionGear = products.filter((p) => sectionIds("Protection Gear").has(p.categoryId)).slice(0, 8);
  const optics = products.filter((p) => sectionIds("Optics").has(p.categoryId)).slice(0, 8);

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
  });

  return (
    <StoreHomeClient
      banners={heroBanner ? [heroBanner] : []}
      promoBanners={promoBanners}
      categories={categories}
      featured={featured.map(toCard)}
      bestSellers={bestSellers.map(toCard)}
      tacticalClothing={tacticalClothing.map(toCard)}
      tacticalBoots={tacticalBoots.map(toCard)}
      protectionGear={protectionGear.map(toCard)}
      optics={optics.map(toCard)}
      newArrivals={newArrivals.map(toCard)}
    />
  );
}
