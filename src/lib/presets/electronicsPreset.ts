import { BannerType, PrismaClient } from "@prisma/client";

type CategoryDef = {
  key: string;
  parentKey?: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  sortOrder: number;
  imageUrl?: string;
};

type ProductDef = {
  title: string;
  categoryKey: string;
  basePrice: number;
  imageUrl?: string;
};

const HEBREW_DESCRIPTION = "מוצר איכותי עם ביצועים גבוהים ואחריות מלאה.";
const ARABIC_DESCRIPTION = "منتج عالي الجودة مع أداء ممتاز وكفالة كاملة.";
const ENGLISH_DESCRIPTION = "High quality product with excellent performance and full warranty.";

const categories: CategoryDef[] = [
  { key: "smartphones", name_he: "סמארטפונים", name_ar: "الهواتف الذكية", name_en: "Smartphones", sortOrder: 10, imageUrl: "demo/electronics/phones/smartphones-main.svg" },
  { key: "iphone", parentKey: "smartphones", name_he: "iPhone", name_ar: "آيفون", name_en: "iPhone", sortOrder: 11 },
  { key: "samsung-phone", parentKey: "smartphones", name_he: "Samsung", name_ar: "سامسونج", name_en: "Samsung", sortOrder: 12 },
  { key: "xiaomi-phone", parentKey: "smartphones", name_he: "Xiaomi", name_ar: "شاومي", name_en: "Xiaomi", sortOrder: 13 },
  { key: "google-pixel", parentKey: "smartphones", name_he: "Google Pixel", name_ar: "جوجل بيكسل", name_en: "Google Pixel", sortOrder: 14 },
  { key: "oppo", parentKey: "smartphones", name_he: "Oppo", name_ar: "أوبو", name_en: "Oppo", sortOrder: 15 },
  { key: "huawei", parentKey: "smartphones", name_he: "Huawei", name_ar: "هواوي", name_en: "Huawei", sortOrder: 16 },
  { key: "nothing", parentKey: "smartphones", name_he: "Nothing", name_ar: "ناثينج", name_en: "Nothing", sortOrder: 17 },

  { key: "computers", name_he: "מחשבים", name_ar: "الحواسيب", name_en: "Computers", sortOrder: 20, imageUrl: "demo/electronics/laptops/laptops-main.svg" },
  { key: "gaming-pcs", parentKey: "computers", name_he: "מחשבי גיימינג", name_ar: "حواسيب ألعاب", name_en: "Gaming PCs", sortOrder: 21 },
  { key: "office-pcs", parentKey: "computers", name_he: "מחשבי משרד", name_ar: "حواسيب مكتبية", name_en: "Office PCs", sortOrder: 22 },
  { key: "student-pcs", parentKey: "computers", name_he: "מחשבים לסטודנטים", name_ar: "حواسيب للطلاب", name_en: "Student PCs", sortOrder: 23 },
  { key: "mini-pcs", parentKey: "computers", name_he: "Mini PCs", name_ar: "ميني PC", name_en: "Mini PCs", sortOrder: 24 },
  { key: "mac", parentKey: "computers", name_he: "Mac", name_ar: "ماك", name_en: "Mac", sortOrder: 25 },

  { key: "laptops", name_he: "לפטופים", name_ar: "أجهزة لابتوب", name_en: "Laptops", sortOrder: 30, imageUrl: "demo/electronics/laptops/laptops-main.svg" },
  { key: "gaming-laptops", parentKey: "laptops", name_he: "לפטופי גיימינג", name_ar: "لابتوب ألعاب", name_en: "Gaming Laptops", sortOrder: 31 },
  { key: "business-laptops", parentKey: "laptops", name_he: "לפטופים עסקיים", name_ar: "لابتوب أعمال", name_en: "Business Laptops", sortOrder: 32 },
  { key: "student-laptops", parentKey: "laptops", name_he: "לפטופים לסטודנטים", name_ar: "لابتوب طلاب", name_en: "Student Laptops", sortOrder: 33 },
  { key: "macbooks", parentKey: "laptops", name_he: "MacBooks", name_ar: "ماك بوك", name_en: "MacBooks", sortOrder: 34 },

  { key: "monitors", name_he: "מסכים", name_ar: "الشاشات", name_en: "Monitors", sortOrder: 40, imageUrl: "demo/electronics/gaming/gaming-main.svg" },
  { key: "gaming-monitors", parentKey: "monitors", name_he: "מסכי גיימינג", name_ar: "شاشات ألعاب", name_en: "Gaming Monitors", sortOrder: 41 },
  { key: "office-monitors", parentKey: "monitors", name_he: "מסכי משרד", name_ar: "شاشات مكتبية", name_en: "Office Monitors", sortOrder: 42 },
  { key: "curved-monitors", parentKey: "monitors", name_he: "מסכים קעורים", name_ar: "شاشات منحنية", name_en: "Curved Monitors", sortOrder: 43 },
  { key: "4k-monitors", parentKey: "monitors", name_he: "מסכי 4K", name_ar: "شاشات 4K", name_en: "4K Monitors", sortOrder: 44 },

  { key: "air-conditioners", name_he: "מזגנים", name_ar: "المكيفات", name_en: "Air Conditioners", sortOrder: 50, imageUrl: "demo/electronics/accessories/accessories-main.svg" },
  { key: "inverter-ac", parentKey: "air-conditioners", name_he: "מזגן אינוורטר", name_ar: "مكيف إنفرتر", name_en: "Inverter AC", sortOrder: 51 },
  { key: "smart-ac", parentKey: "air-conditioners", name_he: "מזגן חכם", name_ar: "مكيف ذكي", name_en: "Smart AC", sortOrder: 52 },
  { key: "portable-ac", parentKey: "air-conditioners", name_he: "מזגן נייד", name_ar: "مكيف متنقل", name_en: "Portable AC", sortOrder: 53 },

  { key: "tables-desks", name_he: "שולחנות ודסקים", name_ar: "طاولات ومكاتب", name_en: "Tables & Desks", sortOrder: 60, imageUrl: "demo/electronics/accessories/accessories-main.svg" },
  { key: "gaming-desk", parentKey: "tables-desks", name_he: "שולחן גיימינג", name_ar: "مكتب ألعاب", name_en: "Gaming Desk", sortOrder: 61 },
  { key: "office-desk", parentKey: "tables-desks", name_he: "שולחן משרד", name_ar: "مكتب عمل", name_en: "Office Desk", sortOrder: 62 },
  { key: "standing-desk", parentKey: "tables-desks", name_he: "שולחן מתכוונן", name_ar: "مكتب واقف", name_en: "Standing Desk", sortOrder: 63 },

  { key: "cables", name_he: "כבלים", name_ar: "الكابلات", name_en: "Cables", sortOrder: 70, imageUrl: "demo/electronics/accessories/accessories-main.svg" },
  { key: "hdmi", parentKey: "cables", name_he: "HDMI", name_ar: "HDMI", name_en: "HDMI", sortOrder: 71 },
  { key: "usb-c", parentKey: "cables", name_he: "USB-C", name_ar: "USB-C", name_en: "USB-C", sortOrder: 72 },
  { key: "lightning", parentKey: "cables", name_he: "Lightning", name_ar: "Lightning", name_en: "Lightning", sortOrder: 73 },
  { key: "ethernet", parentKey: "cables", name_he: "Ethernet", name_ar: "Ethernet", name_en: "Ethernet", sortOrder: 74 },

  { key: "chargers", name_he: "מטענים", name_ar: "الشواحن", name_en: "Chargers", sortOrder: 80, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { key: "phone-cases", name_he: "כיסויים לנייד", name_ar: "أغطية الهاتف", name_en: "Phone Cases", sortOrder: 90, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { key: "screen-protectors", name_he: "מגני מסך", name_ar: "واقيات الشاشة", name_en: "Screen Protectors", sortOrder: 100, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { key: "smart-watches", name_he: "שעונים חכמים", name_ar: "الساعات الذكية", name_en: "Smart Watches", sortOrder: 110, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { key: "audio", name_he: "אודיו", name_ar: "الصوت", name_en: "Audio", sortOrder: 120, imageUrl: "demo/electronics/audio/audio-main.svg" },
  { key: "gaming", name_he: "גיימינג", name_ar: "الألعاب", name_en: "Gaming", sortOrder: 130, imageUrl: "demo/electronics/gaming/gaming-main.svg" },
  { key: "tvs", name_he: "טלוויזיות", name_ar: "التلفزيونات", name_en: "TVs", sortOrder: 140, imageUrl: "demo/electronics/gaming/gaming-main.svg" },
  { key: "office-equipment", name_he: "ציוד משרדי", name_ar: "معدات مكتبية", name_en: "Office Equipment", sortOrder: 150, imageUrl: "demo/electronics/laptops/laptops-main.svg" },
  { key: "security-cameras", name_he: "אבטחה ומצלמות", name_ar: "الأمن والكاميرات", name_en: "Security & Cameras", sortOrder: 160, imageUrl: "demo/electronics/phones/smartphones-main.svg" },
  { key: "smart-home", name_he: "בית חכם", name_ar: "منزل ذكي", name_en: "Smart Home", sortOrder: 170, imageUrl: "demo/electronics/accessories/accessories-main.svg" },
];

const baseProducts: ProductDef[] = [
  { title: "iPhone 15", categoryKey: "iphone", basePrice: 3799, imageUrl: "demo/electronics/phones/device-phone.svg" },
  { title: "iPhone 15 Pro", categoryKey: "iphone", basePrice: 4499, imageUrl: "demo/electronics/phones/device-phone.svg" },
  { title: "iPhone 15 Pro Max", categoryKey: "iphone", basePrice: 4999, imageUrl: "demo/electronics/phones/device-phone-alt.svg" },
  { title: "iPhone 16", categoryKey: "iphone", basePrice: 4299, imageUrl: "demo/electronics/phones/device-phone.svg" },
  { title: "iPhone 16 Pro Max", categoryKey: "iphone", basePrice: 5299, imageUrl: "demo/electronics/phones/device-phone-alt.svg" },
  { title: "Samsung Galaxy S24", categoryKey: "samsung-phone", basePrice: 3899, imageUrl: "demo/electronics/phones/device-phone.svg" },
  { title: "Samsung Galaxy S25 Ultra", categoryKey: "samsung-phone", basePrice: 4699, imageUrl: "demo/electronics/phones/device-phone-alt.svg" },
  { title: "Xiaomi 14 Ultra", categoryKey: "xiaomi-phone", basePrice: 3199, imageUrl: "demo/electronics/phones/device-phone.svg" },
  { title: "Google Pixel 9", categoryKey: "google-pixel", basePrice: 3599, imageUrl: "demo/electronics/phones/device-phone.svg" },
  { title: "ASUS Gaming PC", categoryKey: "gaming-pcs", basePrice: 5999, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "Lenovo ThinkCentre", categoryKey: "office-pcs", basePrice: 3299, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "Dell Office PC", categoryKey: "office-pcs", basePrice: 2799, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "HP EliteDesk", categoryKey: "office-pcs", basePrice: 2999 },
  { title: "Mac Mini M4", categoryKey: "mac", basePrice: 3499, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "MacBook Air M4", categoryKey: "macbooks", basePrice: 4799, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "MacBook Pro M5", categoryKey: "macbooks", basePrice: 8999, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "ASUS TUF Gaming", categoryKey: "gaming-laptops", basePrice: 5499, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "Lenovo Legion", categoryKey: "gaming-laptops", basePrice: 6199, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "Dell XPS", categoryKey: "business-laptops", basePrice: 5299, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "HP Pavilion", categoryKey: "student-laptops", basePrice: 3299 },
  { title: "Acer Nitro", categoryKey: "gaming-laptops", basePrice: 4299, imageUrl: "demo/electronics/laptops/laptop-device.svg" },
  { title: "Samsung Odyssey G7", categoryKey: "gaming-monitors", basePrice: 2299, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "LG UltraWide", categoryKey: "curved-monitors", basePrice: 1999, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "ASUS 4K Monitor", categoryKey: "4k-monitors", basePrice: 1899, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "Dell Professional Monitor", categoryKey: "office-monitors", basePrice: 1399 },
  { title: "Electra Smart AC", categoryKey: "smart-ac", basePrice: 2999 },
  { title: "Tornado Inverter", categoryKey: "inverter-ac", basePrice: 2699 },
  { title: "LG Dual Inverter", categoryKey: "inverter-ac", basePrice: 3199 },
  { title: "Tadiran Alpha Pro", categoryKey: "smart-ac", basePrice: 3499 },
  { title: "RGB Gaming Desk", categoryKey: "gaming-desk", basePrice: 1499, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "White Office Table", categoryKey: "office-desk", basePrice: 999 },
  { title: "Electric Standing Desk", categoryKey: "standing-desk", basePrice: 1999 },
  { title: "HDMI 2.1 Cable", categoryKey: "hdmi", basePrice: 79, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "USB-C Fast Cable", categoryKey: "usb-c", basePrice: 49, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Lightning Cable", categoryKey: "lightning", basePrice: 59, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Cat6 Cable", categoryKey: "ethernet", basePrice: 69, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "65W USB-C Charger", categoryKey: "chargers", basePrice: 199, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "MagSafe Charger", categoryKey: "chargers", basePrice: 249, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Samsung Fast Charger", categoryKey: "chargers", basePrice: 179, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Wireless Charger", categoryKey: "chargers", basePrice: 159, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "iPhone Silicone Case", categoryKey: "phone-cases", basePrice: 99, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Galaxy Shockproof Case", categoryKey: "phone-cases", basePrice: 89, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Transparent Cover", categoryKey: "phone-cases", basePrice: 49 },
  { title: "Privacy Glass", categoryKey: "screen-protectors", basePrice: 69, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Tempered Glass", categoryKey: "screen-protectors", basePrice: 59, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Camera Lens Protector", categoryKey: "screen-protectors", basePrice: 49, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Apple Watch Ultra", categoryKey: "smart-watches", basePrice: 3499, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Galaxy Watch 7", categoryKey: "smart-watches", basePrice: 1499, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Huawei Watch GT", categoryKey: "smart-watches", basePrice: 1299, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Xiaomi Smart Band", categoryKey: "smart-watches", basePrice: 299, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "AirPods Pro", categoryKey: "audio", basePrice: 1099, imageUrl: "demo/electronics/audio/audio-device.svg" },
  { title: "Sony WH-1000XM6", categoryKey: "audio", basePrice: 1499, imageUrl: "demo/electronics/audio/audio-device.svg" },
  { title: "JBL Charge", categoryKey: "audio", basePrice: 799, imageUrl: "demo/electronics/audio/audio-device.svg" },
  { title: "Samsung Soundbar", categoryKey: "audio", basePrice: 1299 },
  { title: "PlayStation 5", categoryKey: "gaming", basePrice: 2499, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "Xbox Series X", categoryKey: "gaming", basePrice: 2399, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "Nintendo Switch OLED", categoryKey: "gaming", basePrice: 1499, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "RGB Gaming Mouse", categoryKey: "gaming", basePrice: 249, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "Gaming Keyboard", categoryKey: "gaming", basePrice: 329, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "Samsung OLED TV", categoryKey: "tvs", basePrice: 6999, imageUrl: "demo/electronics/gaming/gaming-device.svg" },
  { title: "LG Smart TV", categoryKey: "tvs", basePrice: 4599 },
  { title: "Xiaomi Android TV", categoryKey: "tvs", basePrice: 2799 },
  { title: "Printer", categoryKey: "office-equipment", basePrice: 699 },
  { title: "Scanner", categoryKey: "office-equipment", basePrice: 499 },
  { title: "Projector", categoryKey: "office-equipment", basePrice: 1499 },
  { title: "Office Chair", categoryKey: "office-equipment", basePrice: 899 },
  { title: "Smart Camera", categoryKey: "security-cameras", basePrice: 399 },
  { title: "CCTV Kit", categoryKey: "security-cameras", basePrice: 1199 },
  { title: "Smart Doorbell", categoryKey: "security-cameras", basePrice: 499 },
  { title: "DVR Recorder", categoryKey: "security-cameras", basePrice: 799 },
  { title: "Smart Plug", categoryKey: "smart-home", basePrice: 149, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
  { title: "Smart Bulb", categoryKey: "smart-home", basePrice: 99, imageUrl: "demo/electronics/accessories/accessory-device.svg" },
];

const skuSafe = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const variants = [
  { label: "Base", multiplier: 1, stock: 22 },
  { label: "Plus", multiplier: 1.12, stock: 16 },
  { label: "Pro", multiplier: 1.28, stock: 9 },
];

export async function seedElectronicsPreset(prisma: PrismaClient, storeId: string): Promise<void> {
  const categoryIdByKey = new Map<string, string>();
  for (const category of categories) {
    const id = `${storeId}-cat-${category.key}`;
    const parentId = category.parentKey ? categoryIdByKey.get(category.parentKey) ?? null : null;
    await prisma.category.upsert({
      where: { id },
      create: {
        id,
        storeId,
        parentId,
        name_he: category.name_he,
        name_ar: category.name_ar,
        name_en: category.name_en,
        description_he: HEBREW_DESCRIPTION,
        description_ar: ARABIC_DESCRIPTION,
        description_en: ENGLISH_DESCRIPTION,
        imageUrl: category.imageUrl ?? null,
        active: true,
        sortOrder: category.sortOrder,
      },
      update: {
        parentId,
        name_he: category.name_he,
        name_ar: category.name_ar,
        name_en: category.name_en,
        description_he: HEBREW_DESCRIPTION,
        description_ar: ARABIC_DESCRIPTION,
        description_en: ENGLISH_DESCRIPTION,
        imageUrl: category.imageUrl ?? null,
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
      const name_en = variant.label === "Base" ? product.title : `${product.title} ${variant.label}`;
      const name_he = variant.label === "Base" ? product.title : `${product.title} ${variant.label}`;
      const name_ar = variant.label === "Base" ? product.title : `${product.title} ${variant.label}`;
      const price = Math.max(49, Math.round(product.basePrice * variant.multiplier));
      const oldPrice = Math.round(price * 1.12);
      const discountPercent = Math.min(40, Math.max(5, Math.round(((oldPrice - price) / oldPrice) * 100)));
      const sku = `ELX-${skuSafe(name_en)}-${seededIndex + 1}`;
      const featured = seededIndex % 5 === 0;
      const stock = Math.max(0, variant.stock + (seededIndex % 9));

      const saved = await prisma.product.upsert({
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

      await prisma.productImage.deleteMany({ where: { storeId, productId: saved.id } });
      if (product.imageUrl && seededIndex % 4 !== 0) {
        await prisma.productImage.create({
          data: {
            storeId,
            productId: saved.id,
            url: product.imageUrl,
            alt: name_en,
            isMain: true,
            sortOrder: 1,
          },
        });
      }
      seededIndex += 1;
    }
  }

  const banners = [
    {
      id: `${storeId}-banner-hero-tech`,
      type: BannerType.HERO,
      isHero: true,
      sortOrder: 1,
      title_he: "NEW TECH COLLECTION",
      title_ar: "NEW TECH COLLECTION",
      title_en: "NEW TECH COLLECTION",
      subtitle_he: "הדור החדש של המכשירים כבר כאן",
      subtitle_ar: "الجيل الجديد من الأجهزة هنا",
      subtitle_en: "The next generation devices are here",
      imageUrl: "/hero.png",
    },
    {
      id: `${storeId}-banner-gaming-week`,
      type: BannerType.SECTION,
      isHero: false,
      sortOrder: 2,
      title_he: "UP TO 40% OFF",
      title_ar: "UP TO 40% OFF",
      title_en: "UP TO 40% OFF",
      subtitle_he: "Gaming Week",
      subtitle_ar: "Gaming Week",
      subtitle_en: "Gaming Week",
      imageUrl: "demo/electronics/banners/hero-gaming-week.svg",
    },
    {
      id: `${storeId}-banner-laptop-deals`,
      type: BannerType.PROMO,
      isHero: false,
      sortOrder: 3,
      title_he: "Laptop Deals",
      title_ar: "Laptop Deals",
      title_en: "Laptop Deals",
      subtitle_he: "Best business & student picks",
      subtitle_ar: "أفضل خيارات الأعمال والطلاب",
      subtitle_en: "Best business & student picks",
      imageUrl: "demo/electronics/banners/laptop-deals.svg",
    },
    {
      id: `${storeId}-banner-audio-collection`,
      type: BannerType.SECTION,
      isHero: false,
      sortOrder: 4,
      title_he: "Audio Collection",
      title_ar: "Audio Collection",
      title_en: "Audio Collection",
      subtitle_he: "סאונד פרימיום לבית ולדרך",
      subtitle_ar: "صوت فاخر للمنزل والطريق",
      subtitle_en: "Premium sound for home and travel",
      imageUrl: "demo/electronics/banners/accessories-promo.svg",
    },
  ];

  for (const banner of banners) {
    await prisma.banner.upsert({
      where: { id: banner.id },
      create: {
        ...banner,
        storeId,
        active: true,
        buttonText_he: "Shop now",
        buttonText_ar: "Shop now",
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
    where: { storeId, id: { not: `${storeId}-banner-hero-tech` } },
    data: { isHero: false },
  });
}
