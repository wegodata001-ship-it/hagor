/**
 * Seed / overwrite official HAGOUR legal documents in StorePage.
 * Uses the existing store id only — never creates a new store.
 * Usage: npx tsx scripts/seed-hagour-legal.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { HAGOUR_DEFAULT_PHONE, HAGOUR_DEFAULT_WHATSAPP } from "../src/lib/hagour-contact";
import { OFFICIAL_LEGAL_DOCS } from "../src/lib/hagour-official-legal";

const root = join(__dirname, "..");
function loadEnvFile(file: string) {
  const path = join(root, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";
const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findUnique({
    where: { id: STORE_ID },
    select: { id: true },
  });
  if (!store) {
    throw new Error(`HAGOUR store not found: ${STORE_ID}. Refusing to create a new store id.`);
  }

  for (const doc of OFFICIAL_LEGAL_DOCS) {
    await prisma.storePage.upsert({
      where: { storeId_slug: { storeId: STORE_ID, slug: doc.slug } },
      create: {
        storeId: STORE_ID,
        slug: doc.slug,
        title: doc.title,
        contentHe: doc.html,
        contentEn: null,
        contentAr: null,
        isPublished: true,
      },
      update: {
        title: doc.title,
        contentHe: doc.html,
        contentEn: null,
        contentAr: null,
        isPublished: true,
      },
    });
    console.log(`OK: ${doc.slug} → ${STORE_ID}`);
  }

  const bySlug = Object.fromEntries(OFFICIAL_LEGAL_DOCS.map((d) => [d.slug, d.html]));
  await prisma.storeSettings.updateMany({
    where: { storeId: STORE_ID },
    data: {
      storePhone: HAGOUR_DEFAULT_PHONE,
      whatsappPhone: HAGOUR_DEFAULT_WHATSAPP,
      terms_he: bySlug.terms,
      privacy_he: bySlug.privacy,
      refund_he: bySlug["cancellation-policy"],
      shipping_he: bySlug["shipping-policy"],
      termsPublishedAt: new Date(),
      privacyPublishedAt: new Date(),
      refundPublishedAt: new Date(),
      shippingPublishedAt: new Date(),
    },
  });

  console.log(`Official HAGOUR legal pages seeded for store: ${STORE_ID}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
