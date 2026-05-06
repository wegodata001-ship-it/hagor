import { CouponType, DeliveryType, PrismaClient, StoreStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "../src/lib/storage";
import { seedStorePreset } from "../src/lib/presets";

const prisma = new PrismaClient();

const STORE_ID = "desigma";
const STORE_SLUG = "desigma";
const STORE_NAME = "DESIGMA";
const ASSETS_FOLDER =
  process.env.NEXT_PUBLIC_ASSETS_FOLDER?.trim().replace(/^\/+|\/+$/g, "") || STORE_ID;

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
      primaryColor: "black",
      secondaryColor: "#6b7280",
      accentColor: "orange",
      currency: "ILS",
      languageDefault: "he",
      rtlEnabled: true,
      whatsappPhone: null,
      supportEmail: null,
      orderNumberPrefix: "DESIGMA",
      nextOrderNumber: 1001,
    },
    update: {
      logoUrl,
      primaryColor: "black",
      accentColor: "orange",
      currency: "ILS",
      languageDefault: "he",
      orderNumberPrefix: "DESIGMA",
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
        name_he: "משלוח צפון",
        name_ar: "شحن شمال",
        name_en: "Shipping North",
        type: DeliveryType.SHIPPING,
        price: 20,
        active: true,
        sortOrder: 2,
      },
      {
        storeId: STORE_ID,
        name_he: "משלוח דרום",
        name_ar: "شحن جنوب",
        name_en: "Shipping South",
        type: DeliveryType.SHIPPING,
        price: 50,
        active: true,
        sortOrder: 3,
      },
      {
        storeId: STORE_ID,
        name_he: "משלוח אזורים מיוחדים",
        name_ar: "شحن مناطق خاصة",
        name_en: "Shipping special areas",
        type: DeliveryType.SHIPPING,
        price: 80,
        active: true,
        sortOrder: 4,
      },
    ],
  });

  await prisma.coupon.upsert({
    where: {
      storeId_code: { storeId: STORE_ID, code: "DESIGMA10" },
    },
    create: {
      storeId: STORE_ID,
      code: "DESIGMA10",
      type: CouponType.PERCENT,
      value: 10,
      active: true,
      expiresAt: null,
    },
    update: { active: true, type: CouponType.PERCENT, value: 10 },
  });

  await seedStorePreset(prisma, STORE_ID, "electronics");

  console.log("DESIGMA seed OK - owner:", owner.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
