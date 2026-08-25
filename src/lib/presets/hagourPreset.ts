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
    slug: "tactical-belt-full-rg",
    name_he: "חגור טקטי שלם RG",
    description_he:
      "חגור טקטי שלם בצבע Ranger Green (RG), הכולל חגור חיצוני וחגור פנימי.\n\nהסט כולל 6 נרתקים:\n- נרתיק אקדח\n- נרתיק גז\n- נרתיק פנס\n- נרתיק אזיקים\n- נרתיק מכשיר קשר\n- נרתיק מחסניות כפולה\n\nצבע: Ranger Green (RG)",
    name_en: "Full tactical belt RG",
    name_ar: "حزام تكتيكي كامل RG",
    description_en:
      "Full tactical belt in Ranger Green (RG), including outer and inner belt.\n\nThe set includes 6 pouches:\n- Pistol holster\n- Gas pouch\n- Flashlight pouch\n- Handcuff pouch\n- Radio pouch\n- Double magazine pouch\n\nColor: Ranger Green (RG)",
    description_ar:
      "حزام تكتيكي كامل بلون Ranger Green (RG)، يشمل حزام خارجي وداخلي.\n\nالمجموعة تشمل 6 جرابات:\n- جراب مسدس\n- جراب غاز\n- جراب مصباح\n- جراب أصفاد\n- جراب جهاز اتصال\n- جراب مخازن مزدوج\n\nاللون: Ranger Green (RG)",
    categoryKey: "belts",
    price: 400,
    featured: true,
  },
  {
    slug: "patrol-belt-black-velcro",
    name_he: "חגור סייר שחור עם סגירת סקוץ'",
    description_he:
      "חגור סייר בצבע שחור עם סגירת סקוץ', הכולל חגור חיצוני וחגור פנימי.\n\nהסט כולל 6 נרתקים:\n- נרתיק אקדח\n- נרתיק גז\n- נרתיק פנס\n- נרתיק אזיקים\n- נרתיק מכשיר קשר\n- נרתיק מחסניות כפולה\n\nצבע: שחור\nסוג סגירה: סקוץ'",
    name_en: "Black patrol belt with velcro closure",
    name_ar: "حزام دورية أسود بإغلاق فيلكرو",
    description_en:
      "Black patrol belt with velcro closure, including outer and inner belt.\n\nThe set includes 6 pouches:\n- Pistol holster\n- Gas pouch\n- Flashlight pouch\n- Handcuff pouch\n- Radio pouch\n- Double magazine pouch\n\nColor: Black\nClosure: Velcro",
    description_ar:
      "حزام دورية أسود بإغلاق فيلكرو، يشمل حزام خارجي وداخلي.\n\nالمجموعة تشمل 6 جرابات:\n- جراب مسدس\n- جراب غاز\n- جراب مصباح\n- جراب أصفاد\n- جراب جهاز اتصال\n- جراب مخازن مزدوج\n\nاللون: أسود\nنوع الإغلاق: فيلكرو",
    categoryKey: "belts",
    price: 400,
    featured: true,
  },
  {
    slug: "patrol-belt-metal-buckle",
    name_he: "חגור סייר עם אבזם מתכת",
    description_he:
      "חגור סייר הכולל חגור חיצוני וחגור פנימי, עם סגירת אבזם מתכת.\n\nהסט כולל 6 נרתקים:\n- נרתיק אקדח\n- נרתיק גז\n- נרתיק פנס\n- נרתיק אזיקים\n- נרתיק מכשיר קשר\n- נרתיק מחסניות כפולה\n\nסוג סגירה: אבזם מתכת",
    name_en: "Patrol belt with metal buckle",
    name_ar: "حزام دورية بإبزيم معدني",
    description_en:
      "Patrol belt including outer and inner belt, with metal buckle closure.\n\nThe set includes 6 pouches:\n- Pistol holster\n- Gas pouch\n- Flashlight pouch\n- Handcuff pouch\n- Radio pouch\n- Double magazine pouch\n\nClosure: Metal buckle",
    description_ar:
      "حزام دورية يشمل حزام خارجي وداخلي، مع إغلاق إبزيم معدني.\n\nالمجموعة تشمل 6 جرابات:\n- جراب مسدس\n- جراب غاز\n- جراب مصباح\n- جراب أصفاد\n- جراب جهاز اتصال\n- جراب مخازن مزدوج\n\nنوع الإغلاق: إبزيم معدني",
    categoryKey: "belts",
    price: 430,
    featured: true,
  },
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

const BELT_PRODUCT_SLUGS = new Set([
  "tactical-belt-full-rg",
  "patrol-belt-black-velcro",
  "patrol-belt-metal-buckle",
]);

/** Additive upsert of the 3 belt kits — never deletes other products. */
export async function upsertHagourBeltProducts(
  prisma: PrismaClient,
  storeId: string,
): Promise<{ created: string[]; updated: string[] }> {
  const categoryIdByKey = await resolveHagourCategoryIds(prisma, storeId);
  const beltsCategoryId = categoryIdByKey.get("belts");
  if (!beltsCategoryId) throw new Error("Belts category missing");

  // Best-effort: mark category as BELT profile when column exists.
  try {
    await prisma.$executeRaw`
      UPDATE "Category"
      SET "optionProfile" = 'BELT'
      WHERE id = ${beltsCategoryId} AND "storeId" = ${storeId}
    `;
  } catch {
    /* column may be missing in some environments */
  }

  const created: string[] = [];
  const updated: string[] = [];
  const beltProducts = products.filter((p) => BELT_PRODUCT_SLUGS.has(p.slug));

  for (const product of beltProducts) {
    const id = `${storeId}-prod-${product.slug}`;
    const sku = `HAG-${product.slug.toUpperCase().replace(/-/g, "_").slice(0, 24)}`;
    const imageUrl = FALLBACK_CATEGORY_IMAGES.belts;
    const existing = await prisma.product.findFirst({
      where: { id, storeId },
      select: { id: true, images: { select: { id: true }, take: 1 } },
    });

    if (existing) {
      await prisma.product.update({
        where: { id },
        data: {
          categoryId: beltsCategoryId,
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
        },
      });
      if (existing.images.length === 0) {
        await prisma.productImage.create({
          data: { storeId, productId: id, url: imageUrl, isMain: true, sortOrder: 0 },
        });
      }
      updated.push(product.name_he);
    } else {
      await prisma.product.create({
        data: {
          id,
          storeId,
          categoryId: beltsCategoryId,
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
      created.push(product.name_he);
    }
  }

  return { created, updated };
}

/** Set stock=100 for every active product in this store only. */
export async function resetActiveHagourStockTo100(
  prisma: PrismaClient,
  storeId: string,
): Promise<{ updated: number; skippedInactive: number; totalActive: number }> {
  const skippedInactive = await prisma.product.count({
    where: { storeId, active: false },
  });
  const result = await prisma.product.updateMany({
    where: { storeId, active: true },
    data: { stock: 100 },
  });
  const totalActive = await prisma.product.count({
    where: { storeId, active: true },
  });
  return { updated: result.count, skippedInactive, totalActive };
}

export async function seedHagourPreset(prisma: PrismaClient, storeId: string): Promise<void> {
  await purgeLegacyHagourCatalog(prisma, storeId);
  await seedHagourProducts(prisma, storeId);

  const heroBanner = {
    id: `${storeId}-banner-hero`,
    type: BannerType.HERO,
    isHero: true,
    sortOrder: 1,
    title_he: "HAGOUR BY WAEL",
    title_ar: "HAGOUR BY WAEL",
    title_en: "HAGOUR BY WAEL",
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
