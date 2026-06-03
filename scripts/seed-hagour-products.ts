/**
 * Fast product-only seed: keeps categories, replaces products with official HAGOUR catalog.
 * Usage: npx tsx scripts/seed-hagour-products.ts
 */
import { PrismaClient } from "@prisma/client";
import { seedHagourProducts } from "../src/lib/presets/hagourPreset";

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";
const prisma = new PrismaClient();

async function main() {
  const count = await seedHagourProducts(prisma, STORE_ID);
  console.log(`Seeded ${count} HAGOUR products for store: ${STORE_ID}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
