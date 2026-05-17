import { BannerType, PrismaClient } from "@prisma/client";

type CategoryDef = {
  key: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  sortOrder: number;
};

type ProductDef = {
  title: string;
  categoryKey: string;
  basePrice: number;
};

const HEBREW_DESCRIPTION =
  "ציוד טקטי מקצועי לשטח, אימונים ומשימות. איכות פרימיום, עמידות גבוהה ואחריות מלאה.";
const ARABIC_DESCRIPTION =
  "معدات تكتيكية احترافية للميدان والتدريب. جودة ممتازة ومتانة عالية مع ضمان كامل.";
const ENGLISH_DESCRIPTION =
  "Professional tactical gear for field, training and missions. Premium build, durability and full warranty.";

const categories: CategoryDef[] = [
  { key: "tactical-bags", name_he: "תיקים טקטיים", name_ar: "حقائب تكتيكية", name_en: "Tactical Bags", sortOrder: 10 },
  { key: "tactical-clothing", name_he: "ביגוד טקטי", name_ar: "ملابس تكتيكية", name_en: "Tactical Clothing", sortOrder: 20 },
  { key: "tactical-boots", name_he: "נעלי טקטי", name_ar: "أحذية تكتيكية", name_en: "Tactical Boots", sortOrder: 30 },
  { key: "optics", name_he: "אופטיקה", name_ar: "بصريات", name_en: "Optics", sortOrder: 40 },
  { key: "holsters", name_he: "נרתיקים", name_ar: "أغطية مسدس", name_en: "Holsters", sortOrder: 50 },
  { key: "helmets", name_he: "קסדות", name_ar: "خوذ", name_en: "Helmets", sortOrder: 60 },
  { key: "protection-gear", name_he: "ציוד הגנה", name_ar: "معدات حماية", name_en: "Protection Gear", sortOrder: 70 },
  { key: "outdoor-equipment", name_he: "ציוד שטח", name_ar: "معدات خارجية", name_en: "Outdoor Equipment", sortOrder: 80 },
  { key: "tactical-accessories", name_he: "אביזרים טקטיים", name_ar: "إكسسوارات تكتيكية", name_en: "Tactical Accessories", sortOrder: 90 },
];

const baseProducts: ProductDef[] = [
  { title: "Assault Pack 45L", categoryKey: "tactical-bags", basePrice: 449 },
  { title: "MOLLE Daypack 28L", categoryKey: "tactical-bags", basePrice: 329 },
  { title: "Hydration Carrier 3L", categoryKey: "tactical-bags", basePrice: 189 },
  { title: "Combat Shirt Pro", categoryKey: "tactical-clothing", basePrice: 279 },
  { title: "Tactical Pants Ripstop", categoryKey: "tactical-clothing", basePrice: 349 },
  { title: "Softshell Jacket OD", categoryKey: "tactical-clothing", basePrice: 499 },
  { title: "Desert Boots MK2", categoryKey: "tactical-boots", basePrice: 599 },
  { title: "Urban Tactical Boot", categoryKey: "tactical-boots", basePrice: 549 },
  { title: "Red Dot Sight 2MOA", categoryKey: "optics", basePrice: 899 },
  { title: "NV Monocular Gen2+", categoryKey: "optics", basePrice: 4299 },
  { title: "Kydex Holster OWB", categoryKey: "holsters", basePrice: 249 },
  { title: "Retention Holster IWB", categoryKey: "holsters", basePrice: 299 },
  { title: "Ballistic Helmet Level IIIA", categoryKey: "helmets", basePrice: 1899 },
  { title: "Bump Helmet Rail System", categoryKey: "helmets", basePrice: 649 },
  { title: "Plate Carrier Lite", categoryKey: "protection-gear", basePrice: 799 },
  { title: "Knee & Elbow Guard Set", categoryKey: "protection-gear", basePrice: 159 },
  { title: "Field Sleeping System", categoryKey: "outdoor-equipment", basePrice: 699 },
  { title: "Tactical Folding Shovel", categoryKey: "outdoor-equipment", basePrice: 129 },
  { title: "Tactical Gloves Touch", categoryKey: "tactical-accessories", basePrice: 89 },
  { title: "IFAK Medical Pouch", categoryKey: "tactical-accessories", basePrice: 219 },
  { title: "Combat Belt System", categoryKey: "tactical-accessories", basePrice: 379 },
  { title: "Tactical Flashlight 1200lm", categoryKey: "tactical-accessories", basePrice: 199 },
];

const skuSafe = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const variants = [
  { label: "Standard", multiplier: 1, stock: 18 },
  { label: "Pro", multiplier: 1.15, stock: 12 },
];

export async function seedTacticalPreset(prisma: PrismaClient, storeId: string): Promise<void> {
  const categoryIdByKey = new Map<string, string>();
  for (const category of categories) {
    const id = `${storeId}-cat-${category.key}`;
    await prisma.category.upsert({
      where: { id },
      create: {
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
      },
      update: {
        name_he: category.name_he,
        name_ar: category.name_ar,
        name_en: category.name_en,
        description_he: HEBREW_DESCRIPTION,
        description_ar: ARABIC_DESCRIPTION,
        description_en: ENGLISH_DESCRIPTION,
        active: true,
        sortOrder: category.sortOrder,
      },
    });
    categoryIdByKey.set(category.key, id);
  }

  let seededIndex = 0;
  for (const product of baseProducts) {
    const categoryId = categoryIdByKey.get(product.categoryKey);
    if (!categoryId) continue;

    for (const variant of variants) {
      const name_en = variant.label === "Standard" ? product.title : `${product.title} ${variant.label}`;
      const name_he = name_en;
      const name_ar = name_en;
      const price = Math.max(49, Math.round(product.basePrice * variant.multiplier));
      const oldPrice = Math.round(price * 1.1);
      const discountPercent = Math.min(25, Math.max(5, Math.round(((oldPrice - price) / oldPrice) * 100)));
      const sku = `HGR-${skuSafe(name_en)}-${seededIndex + 1}`;
      const featured = seededIndex % 4 === 0;
      const stock = Math.max(0, variant.stock + (seededIndex % 7));

      await prisma.product.upsert({
        where: { storeId_sku: { storeId, sku } },
        create: {
          storeId,
          categoryId,
          title_he: name_he,
          title_ar: name_ar,
          title_en: name_en,
          name_he,
          name_ar,
          name_en,
          description_he: HEBREW_DESCRIPTION,
          description_ar: ARABIC_DESCRIPTION,
          description_en: ENGLISH_DESCRIPTION,
          price,
          oldPrice,
          discountPercent,
          stock,
          sku,
          active: true,
          featured,
        },
        update: {
          categoryId,
          title_he: name_he,
          title_ar: name_ar,
          title_en: name_en,
          name_he,
          name_ar,
          name_en,
          description_he: HEBREW_DESCRIPTION,
          description_ar: ARABIC_DESCRIPTION,
          description_en: ENGLISH_DESCRIPTION,
          price,
          oldPrice,
          discountPercent,
          stock,
          active: true,
          featured,
        },
      });
      seededIndex += 1;
    }
  }

  const banners = [
    {
      id: `${storeId}-banner-hero-tactical`,
      type: BannerType.HERO,
      isHero: true,
      sortOrder: 1,
      title_he: "HAGOR BY WAEL",
      title_ar: "HAGOR BY WAEL",
      title_en: "HAGOR BY WAEL",
      subtitle_he: "ציוד טקטי מקצועי לשטח, אימון ומשימה",
      subtitle_ar: "معدات تكتيكية احترافية للميدان والتدريب",
      subtitle_en: "Professional tactical gear for field and mission",
      imageUrl: "/hero.png",
    },
    {
      id: `${storeId}-banner-protection`,
      type: BannerType.SECTION,
      isHero: false,
      sortOrder: 2,
      title_he: "ציוד הגנה",
      title_ar: "معدات الحماية",
      title_en: "Protection Gear",
      subtitle_he: "מגנים, קסדות ומערכות נשיאה",
      subtitle_ar: "دروع وخوذ وأنظمة حمل",
      subtitle_en: "Plates, helmets and load-bearing systems",
      imageUrl: "/hagor-hero-fallback.svg",
    },
    {
      id: `${storeId}-banner-outdoor`,
      type: BannerType.PROMO,
      isHero: false,
      sortOrder: 3,
      title_he: "ציוד שטח",
      title_ar: "معدات الميدان",
      title_en: "Outdoor Equipment",
      subtitle_he: "מוכנים לכל תנאי שטח",
      subtitle_ar: "جاهزون لكل ظروف الميدان",
      subtitle_en: "Ready for any terrain",
      imageUrl: "/hagor-hero-fallback.svg",
    },
  ];

  for (const banner of banners) {
    await prisma.banner.upsert({
      where: { id: banner.id },
      create: {
        ...banner,
        storeId,
        active: true,
        buttonText_he: "לקטלוג",
        buttonText_ar: "للتسوق",
        buttonText_en: "Shop now",
        buttonUrl: "/products",
      },
      update: {
        type: banner.type,
        isHero: banner.isHero,
        active: true,
        sortOrder: banner.sortOrder,
        title_he: banner.title_he,
        title_ar: banner.title_ar,
        title_en: banner.title_en,
        subtitle_he: banner.subtitle_he,
        subtitle_ar: banner.subtitle_ar,
        subtitle_en: banner.subtitle_en,
        imageUrl: banner.imageUrl,
      },
    });
  }
  await prisma.banner.updateMany({
    where: { storeId, id: { not: `${storeId}-banner-hero-tactical` } },
    data: { isHero: false },
  });
}
