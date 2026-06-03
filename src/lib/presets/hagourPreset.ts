import { BannerType, PrismaClient } from "@prisma/client";
import { hagourCategoryId, type HagourCategoryKey } from "@/lib/hagour-catalog";
import { FALLBACK_CATEGORY_IMAGES } from "@/lib/category-images";

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
] as const;

type HagourProductSeed = {
  slug: string;
  name_he: string;
  description_he: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  categoryKey: HagourCategoryKey;
  price: number;
  featured?: boolean;
};

/** Official HAGOUR catalog — only these products (no demo / electronics). */
const products: HagourProductSeed[] = [
  {
    slug: "pistol-holster-fabric",
    name_he: "נרתיק אקדח בד",
    description_he: "נרתיק אקדח אוניברסלי.",
    name_en: "Fabric pistol holster",
    name_ar: "جراب مسدس قماش",
    description_en: "Universal fabric pistol holster.",
    description_ar: "جراب مسدس قماشي عالمي.",
    categoryKey: "pistol-holsters",
    price: 70,
  },
  {
    slug: "pistol-holster-with-flashlight",
    name_he: "נרתיק אקדח עם פנס",
    description_he:
      "נרתיק אקדח שמתחבר לחגור.\nמתאים לאקדח עם פנס ולייזר.\nמתאים גם לאקדח רגיל.",
    name_en: "Pistol holster with flashlight",
    name_ar: "جراب مسدس مع مصباح",
    description_en:
      "Belt-mounted pistol holster.\nFits pistols with flashlight and laser.\nAlso fits standard pistols.",
    description_ar:
      "جراب مسدس يتصل بالحزام.\nمناسب لمسدس مع مصباح وليزر.\nمناسب أيضاً للمسدس العادي.",
    categoryKey: "pistol-holsters",
    price: 100,
    featured: true,
  },
  {
    slug: "belt-phone-holster",
    name_he: "נרתיק טלפון לחגורה",
    description_he: "נרתיק טלפון המתחבר לחגור.\nניתן לשימוש במצב עמידה או שכיבה.",
    name_en: "Belt phone pouch",
    name_ar: "جراب هاتف للحزام",
    description_en: "Phone pouch that mounts on the belt.\nUsable standing or prone.",
    description_ar: "جراب هاتف يتصل بالحزام.\nللاستخدام وقوفاً أو استلقاءً.",
    categoryKey: "accessories",
    price: 80,
    featured: true,
  },
  {
    slug: "flashlight-holster",
    name_he: "נרתיק פנס",
    description_he: "נרתיק לפנס המתחבר לחגור.",
    name_en: "Flashlight holster",
    name_ar: "جراب مصباح",
    description_en: "Flashlight holster that mounts on the belt.",
    description_ar: "جراب مصباح يتصل بالحزام.",
    categoryKey: "accessories",
    price: 40,
  },
  {
    slug: "pepper-spray-holster",
    name_he: "נרתיק גז פלפל",
    description_he: "נרתיק לגז פלפל המתחבר לחגור.",
    name_en: "Pepper spray holster",
    name_ar: "جراب رذاذ الفلفل",
    description_en: "Pepper spray holster that mounts on the belt.",
    description_ar: "جراب رذاذ الفلفل يتصل بالحزام.",
    categoryKey: "accessories",
    price: 40,
  },
  {
    slug: "double-magazine-holster",
    name_he: "נרתיק מחסניות כפולה",
    description_he: "נרתיק כפול למחסניות המתחבר לחגור.",
    name_en: "Double magazine pouch",
    name_ar: "جراب مخازن مزدوج",
    description_en: "Double magazine pouch that mounts on the belt.",
    description_ar: "جراب مزدوج للمخازن يتصل بالحزام.",
    categoryKey: "accessories",
    price: 70,
    featured: true,
  },
  {
    slug: "single-magazine-holster",
    name_he: "נרתיק מחסנית בודדת",
    description_he: "נרתיק למחסנית בודדת המתחבר לחגור.",
    name_en: "Single magazine pouch",
    name_ar: "جراب مخزن مفرد",
    description_en: "Single magazine pouch that mounts on the belt.",
    description_ar: "جراب لمخزن مفرد يتصل بالحزام.",
    categoryKey: "accessories",
    price: 40,
  },
  {
    slug: "handcuff-holster",
    name_he: "נרתיק אזיקים",
    description_he: "נרתיק לאזיקים המתחבר לחגור.",
    name_en: "Handcuff holster",
    name_ar: "جراب أصفاد",
    description_en: "Handcuff holster that mounts on the belt.",
    description_ar: "جراب أصفاد يتصل بالحزام.",
    categoryKey: "accessories",
    price: 70,
  },
  {
    slug: "radio-holster",
    name_he: "נרתיק מכשיר קשר",
    description_he: "נרתיק למכשיר קשר המתחבר לחגור.",
    name_en: "Radio holster",
    name_ar: "جراب جهاز لاسلكي",
    description_en: "Radio holster that mounts on the belt.",
    description_ar: "جراب جهاز لاسلكي يتصل بالحزام.",
    categoryKey: "accessories",
    price: 70,
  },
];

/** Hard-delete legacy demo/tactical/electronics catalog data for this store. */
export async function purgeLegacyHagourCatalog(
  prisma: PrismaClient,
  storeId: string,
): Promise<{ products: number; categories: number; banners: number }> {
  const heroBannerId = `${storeId}-banner-hero`;

  const productsDeleted = await prisma.product.deleteMany({ where: { storeId } });
  const categories = await prisma.category.deleteMany({ where: { storeId } });
  const banners = await prisma.banner.deleteMany({
    where: { storeId, id: { not: heroBannerId } },
  });

  return {
    products: productsDeleted.count,
    categories: categories.count,
    banners: banners.count,
  };
}

/** Resolve category IDs without touching optionProfile (DB column may be missing). */
async function resolveHagourCategoryIds(prisma: PrismaClient, storeId: string) {
  const categoryIdByKey = new Map<string, string>();
  const now = new Date();

  for (const category of categories) {
    const id = hagourCategoryId(storeId, category.key);
    const existing = await prisma.category.findFirst({
      where: { id, storeId },
      select: { id: true },
    });

    if (existing) {
      categoryIdByKey.set(category.key, id);
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "Category" (
        id, "storeId", "parentId",
        name_he, name_ar, name_en,
        description_he, description_ar, description_en,
        "imageUrl", active, "sortOrder",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${storeId}, NULL,
        ${category.name_he}, ${category.name_ar}, ${category.name_en},
        ${HEBREW_DESCRIPTION}, ${ARABIC_DESCRIPTION}, ${ENGLISH_DESCRIPTION},
        NULL, true, ${category.sortOrder},
        ${now}, ${now}
      )
    `;
    categoryIdByKey.set(category.key, id);
  }

  return categoryIdByKey;
}

/** Replace all store products with the official catalog (keeps categories). */
export async function seedHagourProducts(prisma: PrismaClient, storeId: string): Promise<number> {
  const categoryIdByKey = await resolveHagourCategoryIds(prisma, storeId);
  await prisma.product.deleteMany({ where: { storeId } });

  let idx = 0;
  for (const product of products) {
    const categoryId = categoryIdByKey.get(product.categoryKey);
    if (!categoryId) continue;

    const sku = `HAG-${String(++idx).padStart(3, "0")}`;
    const id = `${storeId}-prod-${product.slug}`;
    const imageUrl = FALLBACK_CATEGORY_IMAGES[product.categoryKey];

    await prisma.product.create({
      data: {
        id,
        storeId,
        categoryId,
        sku,
        name_he: product.name_he,
        name_ar: product.name_ar,
        name_en: product.name_en,
        title_he: product.name_he,
        title_ar: product.name_ar,
        title_en: product.name_en,
        description_he: product.description_he,
        description_ar: product.description_ar,
        description_en: product.description_en,
        price: product.price,
        stock: 100,
        active: true,
        featured: product.featured === true,
        images: {
          create: {
            storeId,
            url: imageUrl,
            isMain: true,
            sortOrder: 0,
          },
        },
      },
    });
  }

  return products.length;
}

export async function seedHagourPreset(prisma: PrismaClient, storeId: string): Promise<void> {
  await purgeLegacyHagourCatalog(prisma, storeId);
  await seedHagourProducts(prisma, storeId);

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

  await prisma.banner.updateMany({
    where: { storeId, id: { not: heroBanner.id } },
    data: { active: false },
  });
}
