// READ-ONLY: renders HAGOR-1022 (or first paid order) as AR + HE PDFs,
// saves to `.tmp/HAGOR-1022-ar.pdf` and `.tmp/HAGOR-1022-he.pdf` for
// visual inspection.
//
// Usage:  node scripts/render-pdf-test.mjs [ORDER_NUMBER]

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// Tiny in-line env loader.
function loadEnvFile(p) {
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const orderRef = process.argv[2] || "HAGOR-1022";
const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID || "hagor";

// Register tsx to transpile TS on the fly.
await import("tsx/esm");

// Stub `server-only` for the Node CLI.
const { Module } = await import("node:module");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") {
    return path.resolve(".tmp/__server-only-stub.js");
  }
  return originalResolve.call(this, request, ...rest);
};
{
  if (!existsSync(".tmp")) mkdirSync(".tmp", { recursive: true });
  writeFileSync(".tmp/__server-only-stub.js", "module.exports = {};");
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ log: ["warn", "error"] });

async function main() {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderRef }, { orderNumber: orderRef }],
      storeId: STORE_ID,
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      address: true,
      deliveryOptionName: true,
      deliveryOptionType: true,
      deliveryPrice: true,
      subtotal: true,
      discountAmount: true,
      pointsDiscountAmount: true,
      total: true,
      notes: true,
      items: {
        select: {
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          selectedOptions: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          provider: true,
          amount: true,
          status: true,
          confirmationNumber: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    console.error(`ORDER_NOT_FOUND: ${orderRef}`);
    process.exit(1);
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: {
      storePhone: true,
      storeAddress: true,
      supportEmail: true,
      businessLegalName: true,
      businessTaxId: true,
      businessWebsite: true,
    },
  });
  const store = await prisma.store.findUnique({ where: { id: STORE_ID }, select: { name: true } });

  const { buildOrderConfirmationPdf } = await import("../src/lib/pdf/order-confirmation-pdf.ts");
  const { attachLocalizedProductNames } = await import("../src/lib/pdf/product-name-loader.ts");

  const localizedItems = await attachLocalizedProductNames(STORE_ID, order.items);
  const orderWithI18n = { ...order, items: localizedItems };
  const payment = order.payments[0] ?? null;

  const outDir = path.resolve(".tmp");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (const lang of ["ar", "he"]) {
    const bytes = await buildOrderConfirmationPdf({
      order: orderWithI18n,
      lang,
      storePhone: settings?.storePhone,
      business: {
        displayName: store?.name ?? null,
        legalName: settings?.businessLegalName ?? null,
        taxId: settings?.businessTaxId ?? null,
        phone: settings?.storePhone ?? null,
        email: settings?.supportEmail ?? null,
        address: settings?.storeAddress ?? null,
        website: settings?.businessWebsite ?? null,
      },
      payment: payment
        ? {
            provider: payment.provider,
            amount: Number(payment.amount),
            paidAt: payment.createdAt,
            status: payment.status,
            confirmationNumber: payment.confirmationNumber,
          }
        : null,
    });
    const outPath = path.join(outDir, `${order.orderNumber}-${lang}.pdf`);
    writeFileSync(outPath, bytes);
    console.log(`OK ${lang} -> ${outPath} (${bytes.length} bytes)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
