/**
 * Update store phone + WhatsApp in DB and replace legacy numbers in legal HTML.
 * Usage: npx tsx scripts/sync-store-phone.ts
 */
import { PrismaClient } from "@prisma/client";
import { HAGOUR_DEFAULT_PHONE, HAGOUR_DEFAULT_WHATSAPP } from "../src/lib/hagour-contact";

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";
const prisma = new PrismaClient();

const LEGACY_PHONES = ["054-229-8822", "0542298822", "054 229 8822", "972542298822", "054779358"];

function replaceLegacyPhones(text: string | null | undefined): string | null {
  if (!text) return text ?? null;
  let out = text;
  for (const legacy of LEGACY_PHONES) {
    if (legacy === "054779358") continue;
    out = out.split(legacy).join(HAGOUR_DEFAULT_PHONE);
  }
  out = out.split("054779358").join(HAGOUR_DEFAULT_PHONE);
  return out;
}

async function main() {
  const settings = await prisma.storeSettings.findUnique({ where: { storeId: STORE_ID } });
  if (!settings) {
    console.error("StoreSettings not found for", STORE_ID);
    process.exit(1);
  }

  await prisma.storeSettings.update({
    where: { storeId: STORE_ID },
    data: {
      storePhone: HAGOUR_DEFAULT_PHONE,
      whatsappPhone: HAGOUR_DEFAULT_WHATSAPP,
      terms_he: replaceLegacyPhones(settings.terms_he),
      terms_en: replaceLegacyPhones(settings.terms_en),
      terms_ar: replaceLegacyPhones(settings.terms_ar),
      privacy_he: replaceLegacyPhones(settings.privacy_he),
      privacy_en: replaceLegacyPhones(settings.privacy_en),
      privacy_ar: replaceLegacyPhones(settings.privacy_ar),
      refund_he: replaceLegacyPhones(settings.refund_he),
      refund_en: replaceLegacyPhones(settings.refund_en),
      refund_ar: replaceLegacyPhones(settings.refund_ar),
      shipping_he: replaceLegacyPhones(settings.shipping_he),
      shipping_en: replaceLegacyPhones(settings.shipping_en),
      shipping_ar: replaceLegacyPhones(settings.shipping_ar),
    },
  });

  const pages = await prisma.storePage.findMany({ where: { storeId: STORE_ID } });
  for (const p of pages) {
    await prisma.storePage.update({
      where: { id: p.id },
      data: {
        contentHe: replaceLegacyPhones(p.contentHe),
        contentEn: replaceLegacyPhones(p.contentEn),
        contentAr: replaceLegacyPhones(p.contentAr),
      },
    });
  }

  console.log(`Updated phone to ${HAGOUR_DEFAULT_PHONE}, WhatsApp ${HAGOUR_DEFAULT_WHATSAPP} for ${STORE_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
