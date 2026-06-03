/**
 * Set official support email in DB + replace legacy addresses in legal HTML.
 * Usage: npx tsx scripts/sync-store-email.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { getHagourSupportEmail, HAGOUR_DEFAULT_SUPPORT_EMAIL } from "../src/lib/hagour-contact";

const root = join(__dirname, "..");

function loadEnvFile(file: string) {
  const path = join(root, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";
const EMAIL = getHagourSupportEmail();
const prisma = new PrismaClient();

const LEGACY_EMAILS = [
  "deloxfon1999888@gmail.com",
  "Deloxfon1999888@gmail.com",
  HAGOUR_DEFAULT_SUPPORT_EMAIL,
].filter((e, i, a) => a.indexOf(e) === i && e.toLowerCase() !== EMAIL.toLowerCase());

function replaceLegacyEmails(text: string | null | undefined): string | null {
  if (!text) return text ?? null;
  let out = text;
  for (const legacy of LEGACY_EMAILS) {
    out = out.split(legacy).join(EMAIL);
    out = out.split(legacy.toLowerCase()).join(EMAIL);
  }
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
      supportEmail: EMAIL,
      terms_he: replaceLegacyEmails(settings.terms_he),
      terms_en: replaceLegacyEmails(settings.terms_en),
      terms_ar: replaceLegacyEmails(settings.terms_ar),
      privacy_he: replaceLegacyEmails(settings.privacy_he),
      privacy_en: replaceLegacyEmails(settings.privacy_en),
      privacy_ar: replaceLegacyEmails(settings.privacy_ar),
      refund_he: replaceLegacyEmails(settings.refund_he),
      refund_en: replaceLegacyEmails(settings.refund_en),
      refund_ar: replaceLegacyEmails(settings.refund_ar),
      shipping_he: replaceLegacyEmails(settings.shipping_he),
      shipping_en: replaceLegacyEmails(settings.shipping_en),
      shipping_ar: replaceLegacyEmails(settings.shipping_ar),
    },
  });

  const pages = await prisma.storePage.findMany({ where: { storeId: STORE_ID } });
  for (const p of pages) {
    await prisma.storePage.update({
      where: { id: p.id },
      data: {
        contentHe: replaceLegacyEmails(p.contentHe),
        contentEn: replaceLegacyEmails(p.contentEn),
        contentAr: replaceLegacyEmails(p.contentAr),
      },
    });
  }

  console.log(`Support email set to ${EMAIL} for store ${STORE_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
