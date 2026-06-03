/**
 * Seed / overwrite HAGOUR terms, privacy and refunds in StorePage.
 * Usage: npx tsx scripts/seed-hagour-legal.ts
 */
import { PrismaClient } from "@prisma/client";
import { HAGOUR_DEFAULT_PHONE, HAGOUR_DEFAULT_WHATSAPP } from "../src/lib/hagour-contact";
import { defaultHagourPrivacyContent, HAGOUR_PRIVACY_SLUG } from "../src/lib/hagour-privacy-default";
import { defaultHagourRefundsContent, HAGOUR_REFUNDS_SLUG } from "../src/lib/hagour-refunds-default";
import { defaultHagourTermsContent, HAGOUR_TERMS_SLUG } from "../src/lib/hagour-terms-default";

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";
const prisma = new PrismaClient();

const PAGES = [
  { slug: HAGOUR_TERMS_SLUG, content: defaultHagourTermsContent },
  { slug: HAGOUR_PRIVACY_SLUG, content: defaultHagourPrivacyContent },
  { slug: HAGOUR_REFUNDS_SLUG, content: defaultHagourRefundsContent },
] as const;

async function main() {
  for (const page of PAGES) {
    const c = page.content();
    await prisma.storePage.upsert({
      where: { storeId_slug: { storeId: STORE_ID, slug: page.slug } },
      create: {
        storeId: STORE_ID,
        slug: page.slug,
        title: c.title,
        contentHe: c.contentHe,
        contentEn: c.contentEn,
        contentAr: c.contentAr,
      },
      update: {
        title: c.title,
        contentHe: c.contentHe,
        contentEn: c.contentEn,
        contentAr: c.contentAr,
      },
    });
    console.log(`OK: ${page.slug}`);
  }

  const terms = defaultHagourTermsContent();
  await prisma.storeSettings.updateMany({
    where: { storeId: STORE_ID },
    data: {
      storePhone: HAGOUR_DEFAULT_PHONE,
      whatsappPhone: HAGOUR_DEFAULT_WHATSAPP,
      terms_he: terms.contentHe,
      terms_en: terms.contentEn,
      terms_ar: terms.contentAr,
      termsPublishedAt: new Date(),
    },
  });

  console.log(`HAGOUR legal pages seeded for store: ${STORE_ID}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
