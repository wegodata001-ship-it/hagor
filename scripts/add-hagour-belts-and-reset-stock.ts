/**
 * Additive HAGOUR update:
 * - Upsert 3 belt kit products into category חגורות
 * - Set stock = 100 for all active products in the existing HAGOUR store only
 *
 * Never creates a new store. Never deletes products.
 * Usage: npx tsx scripts/add-hagour-belts-and-reset-stock.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  resetActiveHagourStockTo100,
  upsertHagourBeltProducts,
} from "../src/lib/presets/hagourPreset";

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
    select: { id: true, name: true },
  });
  if (!store) {
    throw new Error(`HAGOUR store not found: ${STORE_ID}. Refusing to create a new store id.`);
  }

  console.log(`Store: ${store.id} (${store.name ?? "unnamed"})`);

  const belts = await upsertHagourBeltProducts(prisma, STORE_ID);
  console.log("Belts created:", belts.created);
  console.log("Belts updated:", belts.updated);

  const stock = await resetActiveHagourStockTo100(prisma, STORE_ID);
  console.log("Active products:", stock.totalActive);
  console.log("Stock set to 100:", stock.updated);
  console.log("Inactive skipped:", stock.skippedInactive);

  const beltRows = await prisma.product.findMany({
    where: {
      storeId: STORE_ID,
      id: {
        in: [
          `${STORE_ID}-prod-tactical-belt-full-rg`,
          `${STORE_ID}-prod-patrol-belt-black-velcro`,
          `${STORE_ID}-prod-patrol-belt-metal-buckle`,
        ],
      },
    },
    select: {
      name_he: true,
      price: true,
      stock: true,
      active: true,
      category: { select: { name_he: true } },
    },
    orderBy: { name_he: "asc" },
  });

  console.log("\nBelt products in DB:");
  for (const p of beltRows) {
    console.log(
      ` - ${p.name_he} | ₪${Number(p.price)} | stock=${p.stock} | active=${p.active} | ${p.category.name_he}`,
    );
  }

  const notHundred = await prisma.product.count({
    where: { storeId: STORE_ID, active: true, NOT: { stock: 100 } },
  });
  if (notHundred > 0) {
    throw new Error(`Expected all active products at stock 100, found ${notHundred} mismatches`);
  }

  console.log("\nOK: belt kits upserted + all active stock = 100");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
