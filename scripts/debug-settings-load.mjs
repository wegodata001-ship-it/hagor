// Debug script: reproduce the settings load exactly like the admin page.
// Prints the error, its code, and how long the query took.

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
function loadEnvFile(file) {
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

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ log: ["warn", "error"] });

const storeId = process.env.NEXT_PUBLIC_STORE_ID || "hagor";
console.log(`storeId = ${storeId}`);

const t0 = Date.now();
try {
  console.log("→ store.findUnique …");
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  console.log(`  store found: ${!!store}`, store ? { name: store.name } : "");

  console.log("→ storeSettings.findUnique …");
  const settings = await prisma.storeSettings.findUnique({
    where: { storeId },
    select: {
      logoUrl: true,
      primaryColor: true,
      accentColor: true,
      secondaryColor: true,
      whatsappPhone: true,
      storePhone: true,
      storeAddress: true,
      paymentProvider: true,
      paymentPublicKey: true,
      paymentSecretKey: true,
      paymentWebhookSecretOverride: true,
      freeShippingMinAmount: true,
      supportEmail: true,
      accountantName: true,
      accountantEmail: true,
      businessLegalName: true,
      businessTaxId: true,
      businessWebsite: true,
      languageDefault: true,
      orderNumberPrefix: true,
      currency: true,
      rtlEnabled: true,
      registrationEnabled: true,
      requireEmailVerificationForCheckout: true,
      productGalleryPreset: true,
      productGalleryMaxHeightPx: true,
      productGalleryMaxWidthPx: true,
      heroTitle_he: true,
      heroTitle_ar: true,
      heroTitle_en: true,
      heroSubtitle_he: true,
      heroSubtitle_ar: true,
      heroSubtitle_en: true,
      heroImageUrl: true,
      invoiceRecipients: true,
    },
  });
  console.log(`  settings found: ${!!settings}`);
  if (settings) {
    console.log("  sample fields:", {
      accountantName: settings.accountantName,
      accountantEmail: settings.accountantEmail,
      businessLegalName: settings.businessLegalName,
      businessTaxId: settings.businessTaxId,
      invoiceRecipients: settings.invoiceRecipients,
    });
  }
  console.log(`✅ OK in ${Date.now() - t0} ms`);
} catch (err) {
  console.log(`❌ FAILED after ${Date.now() - t0} ms`);
  console.error("code:", err?.code);
  console.error("message:", err?.message?.slice?.(0, 1200));
  console.error("meta:", err?.meta);
} finally {
  await prisma.$disconnect();
}
