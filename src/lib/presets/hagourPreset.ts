import { BannerType, PrismaClient } from "@prisma/client";
import { hagourCategoryId } from "@/lib/hagour-catalog";

const HEBREW_DESCRIPTION =
  "חגורות ונרתיקים מקצועיים — איכות פרימיום, התאמה מדויקת ועמידות לשימוש יומיומי.";
const ARABIC_DESCRIPTION =
  "أحزمة وجرابات احترافية — جودة ممتازة ومتانة عالية للاستخدام اليومي.";
const ENGLISH_DESCRIPTION =
  "Professional belts and holsters — premium quality, precise fit and daily durability.";

const categories = [
  {
    key: "belts" as const,
    optionProfile: "BELT" as const,
    name_he: "חגורות",
    name_ar: "أحزمة",
    name_en: "Belts",
    sortOrder: 10,
  },
  {
    key: "pistol-holsters" as const,
    optionProfile: "HOLSTER" as const,
    name_he: "נרתיקים לאקדח",
    name_ar: "جرابات مسدس",
    name_en: "Pistol Holsters",
    sortOrder: 20,
  },
  {
    key: "weapon-holsters" as const,
    optionProfile: "HOLSTER" as const,
    name_he: "נרתיקים לנשק",
    name_ar: "جرابات سلاح",
    name_en: "Weapon Holsters",
    sortOrder: 30,
  },
  {
    key: "bags" as const,
    optionProfile: null,
    name_he: "תיקים",
    name_ar: "حقائب",
    name_en: "Bags",
    sortOrder: 40,
  },
  {
    key: "accessories" as const,
    optionProfile: null,
    name_he: "תוספות",
    name_ar: "إكسسوارات",
    name_en: "Accessories",
    sortOrder: 50,
  },
];

const products = [
  { title: "חגורת טקטית Pro", categoryKey: "belts" as const, basePrice: 289 },
  { title: "חגורת MOLLE Heavy Duty", categoryKey: "belts" as const, basePrice: 349 },
  { title: "נרתיק Kydex לאקדח", categoryKey: "pistol-holsters" as const, basePrice: 249 },
  { title: "נרתיק Retention IWB", categoryKey: "pistol-holsters" as const, basePrice: 299 },
  { title: "נרתיק OWB לנשק ארוך", categoryKey: "weapon-holsters" as const, basePrice: 399 },
  { title: "נרתיק סער מודולרי", categoryKey: "weapon-holsters" as const, basePrice: 449 },
];

/** Hard-delete legacy demo/tactical/electronics catalog data for this store. */
export async function purgeLegacyHagourCatalog(
  prisma: PrismaClient,
  storeId: string,
): Promise<{ products: number; categories: number; banners: number }> {
  const heroBannerId = `${storeId}-banner-hero`;

  const products = await prisma.product.deleteMany({ where: { storeId } });
  const categories = await prisma.category.deleteMany({ where: { storeId } });
  const banners = await prisma.banner.deleteMany({
    where: { storeId, id: { not: heroBannerId } },
  });

  return {
    products: products.count,
    categories: categories.count,
    banners: banners.count,
  };
}

export async function seedHagourPreset(prisma: PrismaClient, storeId: string): Promise<void> {
  await purgeLegacyHagourCatalog(prisma, storeId);

  const categoryIdByKey = new Map<string, string>();

  for (const category of categories) {
    const id = hagourCategoryId(storeId, category.key);
    await prisma.category.create({
      data: {
        id,
        storeId,
        parentId: null,
        name_he: category.name_he,
        name_ar: category.name_ar,
        name_en: category.name_en,
        description_he: HEBREW_DESCRIPTION,
        description_ar: ARABIC_DESCRIPTION,
        description_en: ENGLISH_DESCRIPTION,
        imageUrl: null,
        active: true,
        sortOrder: category.sortOrder,
        optionProfile: category.optionProfile ?? null,
      },
    });
    categoryIdByKey.set(category.key, id);
  }

  let idx = 0;
  for (const product of products) {
    const categoryId = categoryIdByKey.get(product.categoryKey);
    if (!categoryId) continue;
    const sku = `HAG-${String(++idx).padStart(3, "0")}`;
    const id = `${storeId}-prod-${sku}`;
    await prisma.product.create({
      data: {
        id,
        storeId,
        categoryId,
        sku,
        name_he: product.title,
        name_ar: product.title,
        name_en: product.title,
        description_he: HEBREW_DESCRIPTION,
        description_ar: ARABIC_DESCRIPTION,
        description_en: ENGLISH_DESCRIPTION,
        price: product.basePrice,
        stock: 25,
        active: true,
        featured: idx <= 4,
      },
    });
  }

  const heroBanner = {
    id: `${storeId}-banner-hero`,
    type: BannerType.HERO,
    isHero: true,
    sortOrder: 1,
    title_he: "HAGOUR",
    title_ar: "HAGOUR",
    title_en: "HAGOUR",
    subtitle_he: "חגורות ונרתיקים מקצועיים",
    subtitle_ar: "أحزمة وجرابات احترافية",
    subtitle_en: "Professional belts & holsters",
    imageUrl: "/hagorpgoto.png",
  };

  await prisma.banner.upsert({
    where: { id: heroBanner.id },
    create: {
      ...heroBanner,
      storeId,
      active: true,
      buttonText_he: "לקטלוג",
      buttonText_ar: "تسوق",
      buttonText_en: "Shop",
      buttonUrl: "/products",
    },
    update: {
      active: true,
      isHero: true,
      imageUrl: heroBanner.imageUrl,
      subtitle_he: heroBanner.subtitle_he,
      subtitle_ar: heroBanner.subtitle_ar,
      subtitle_en: heroBanner.subtitle_en,
    },
  });

  // Deactivate any stray banners that survived purge by id mismatch
  await prisma.banner.updateMany({
    where: { storeId, id: { not: heroBanner.id } },
    data: { active: false },
  });
}
