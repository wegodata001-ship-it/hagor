import { CouponType, DeliveryType, PrismaClient, StoreStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "../src/lib/storage";
import { seedStorePreset } from "../src/lib/presets";
import { defaultLegalFlat } from "../src/lib/legal-defaults";
import { HAGOUR_DEFAULT_PHONE } from "../src/lib/hagour-legal-contact";
import { seedAllHagourLegalPages } from "../src/lib/store-pages";

const prisma = new PrismaClient();

const STORE_ID = "hagor";
const STORE_SLUG = "hagor";
const STORE_NAME = "HAGOR BY WAEL";
const ASSETS_FOLDER =
  process.env.NEXT_PUBLIC_ASSETS_FOLDER?.trim().replace(/^\/+|\/+$/g, "") || STORE_ID;

const STORE_PHONE = process.env.NEXT_PUBLIC_STORE_PHONE?.trim() || HAGOUR_DEFAULT_PHONE;
const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.trim() || "";

function requiredEnv(name: "STORE_OWNER_EMAIL" | "STORE_OWNER_PASSWORD"): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("WRITE_")) {
    throw new Error(`Missing required env ${name}`);
  }
  return value;
}

async function resolveLogoPath(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || key === "placeholder") return null;

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`${ASSETS_FOLDER}/logo`, { limit: 10, sortBy: { column: "name", order: "asc" } });
    if (error || !data || data.length === 0) return null;
    const firstFile = data.find((f) => !!f.name);
    if (!firstFile?.name) return null;
    return `${ASSETS_FOLDER}/logo/${firstFile.name}`;
  } catch {
    return null;
  }
}

async function main() {
  const ownerEmail = requiredEnv("STORE_OWNER_EMAIL").toLowerCase();
  const ownerPassword = requiredEnv("STORE_OWNER_PASSWORD");
  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);
  const logoUrl = await resolveLogoPath();

  await prisma.store.upsert({
    where: { id: STORE_ID },
    create: {
      id: STORE_ID,
      name: STORE_NAME,
      slug: STORE_SLUG,
      domain: null,
      templateKey: STORE_ID,
      status: StoreStatus.ACTIVE,
    },
    update: {
      name: STORE_NAME,
      slug: STORE_SLUG,
      templateKey: STORE_ID,
      status: StoreStatus.ACTIVE,
    },
  });

  await prisma.storeSettings.upsert({
    where: { storeId: STORE_ID },
    create: {
      storeId: STORE_ID,
      logoUrl,
      primaryColor: "#0B0B0B",
      secondaryColor: "#1A1A1A",
      accentColor: "#C89211",
      currency: "ILS",
      languageDefault: "he",
      rtlEnabled: true,
      whatsappPhone: WHATSAPP_PHONE || null,
      storePhone: STORE_PHONE || null,
      storeAddress: null,
      supportEmail: null,
      orderNumberPrefix: "HAGOR",
      nextOrderNumber: 1001,
      freeShippingMinAmount: 499,
      ...defaultLegalFlat(),
      termsPublishedAt: new Date(),
      privacyPublishedAt: new Date(),
      refundPublishedAt: new Date(),
      shippingPublishedAt: new Date(),
      heroTitle_he: "ציוד טקטי מקצועי",
      heroTitle_ar: "معدات تكتيكية احترافية",
      heroTitle_en: "Professional Tactical Gear",
      heroSubtitle_he: "ביגוד, נעליים, אופטיקה והגנה — לשטח ולמשימה",
      heroSubtitle_ar: "ملابس وأحذية وبصريات وحماية للميدان",
      heroSubtitle_en: "Clothing, boots, optics and protection for the field",
    },
    update: {
      logoUrl,
      primaryColor: "#0B0B0B",
      secondaryColor: "#1A1A1A",
      accentColor: "#C89211",
      currency: "ILS",
      languageDefault: "he",
      orderNumberPrefix: "HAGOR",
      whatsappPhone: WHATSAPP_PHONE || null,
      storePhone: STORE_PHONE || null,
    },
  });

  await prisma.loyaltySettings.upsert({
    where: { storeId: STORE_ID },
    create: {
      storeId: STORE_ID,
      enabled: true,
      pointsPerShekel: 1,
      minOrderForPoints: 50,
      pointsToIlsRate: 10,
      allowRedeem: true,
      pointsExpireDays: null,
    },
    update: {
      enabled: true,
      pointsPerShekel: 1,
      minOrderForPoints: 50,
      pointsToIlsRate: 10,
      allowRedeem: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: {
      storeId_email: { storeId: STORE_ID, email: ownerEmail },
    },
    create: {
      storeId: STORE_ID,
      name: "Store Owner",
      email: ownerEmail,
      password: ownerPasswordHash,
      acceptedTermsAt: new Date(),
      role: UserRole.STORE_OWNER,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      password: ownerPasswordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.deliveryOption.deleteMany({ where: { storeId: STORE_ID } });
  await prisma.deliveryOption.createMany({
    data: [
      {
        storeId: STORE_ID,
        name_he: "איסוף מהחנות",
        name_ar: "استلام من المتجر",
        name_en: "Pickup from store",
        type: DeliveryType.PICKUP,
        price: 0,
        active: true,
        sortOrder: 1,
      },
      {
        storeId: STORE_ID,
        name_he: "משלוח רגיל",
        name_ar: "شحن عادي",
        name_en: "Standard shipping",
        type: DeliveryType.SHIPPING,
        price: 35,
        active: true,
        sortOrder: 2,
      },
      {
        storeId: STORE_ID,
        name_he: "משלוח מהיר",
        name_ar: "شحن سريع",
        name_en: "Express shipping",
        type: DeliveryType.SHIPPING,
        price: 55,
        active: true,
        sortOrder: 3,
      },
    ],
  });

  await prisma.coupon.upsert({
    where: {
      storeId_code: { storeId: STORE_ID, code: "HAGOR10" },
    },
    create: {
      storeId: STORE_ID,
      code: "HAGOR10",
      type: CouponType.PERCENT,
      value: 10,
      active: true,
      expiresAt: null,
    },
    update: { active: true, type: CouponType.PERCENT, value: 10 },
  });

  await seedStorePreset(prisma, STORE_ID, "hagour");
  await seedAllHagourLegalPages(STORE_ID, true);

  console.log("HAGOR BY WAEL seed OK - owner:", owner.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
