import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { StoreHomeClient } from "@/components/storefront/store-home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const storeId = getStoreId();
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

  const heroBanner = banners.find((b) => b.isHero) ?? null;
  const nonHeroBanners = banners.filter((b) => !b.isHero);
  const featured = products.filter((p) => p.featured).slice(0, 12);
  const bestSellers = [...products]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 10);
  const childIdsByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = childIdsByParent.get(category.parentId) ?? [];
    list.push(category.id);
    childIdsByParent.set(category.parentId, list);
  }
  const sectionIds = (rootName: string) => {
    const root = categories.find((c) => !c.parentId && c.name_en.toLowerCase() === rootName.toLowerCase());
    if (!root) return new Set<string>();
    return new Set([root.id, ...(childIdsByParent.get(root.id) ?? [])]);
  };
  const gamingIds = sectionIds("Gaming");
  const laptopIds = sectionIds("Laptops");
  const audioIds = sectionIds("Audio");
  const smartHomeIds = sectionIds("Smart Home");
  const airConditionerIds = sectionIds("Air Conditioners");
  const gamingCollection = products.filter((p) => gamingIds.has(p.categoryId)).slice(0, 8);
  const laptopDeals = products.filter((p) => laptopIds.has(p.categoryId)).slice(0, 8);
  const audioCollection = products.filter((p) => audioIds.has(p.categoryId)).slice(0, 8);
  const smartHome = products.filter((p) => smartHomeIds.has(p.categoryId)).slice(0, 8);
  const airConditionerDeals = products.filter((p) => airConditionerIds.has(p.categoryId)).slice(0, 8);
  const newArrivals = [...products].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 8);

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
      promoBanners={nonHeroBanners}
      categories={categories}
      featured={featured.map(toCard)}
      bestSellers={bestSellers.map(toCard)}
      gamingCollection={gamingCollection.map(toCard)}
      laptopDeals={laptopDeals.map(toCard)}
      audioCollection={audioCollection.map(toCard)}
      smartHome={smartHome.map(toCard)}
      airConditionerDeals={airConditionerDeals.map(toCard)}
      newArrivals={newArrivals.map(toCard)}
    />
  );
}
