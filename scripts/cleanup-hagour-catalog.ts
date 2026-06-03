import { PrismaClient } from "@prisma/client";
import { purgeLegacyHagourCatalog, seedHagourPreset } from "../src/lib/presets/hagourPreset";
import { deleteBlockedStorageRoots } from "../src/lib/store-assets-cleanup";

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";

const prisma = new PrismaClient();

async function main() {
  console.log(`Cleaning HAGOUR catalog for store: ${STORE_ID}`);

  const purged = await purgeLegacyHagourCatalog(prisma, STORE_ID);
  console.log("Purged:", purged);

  await seedHagourPreset(prisma, STORE_ID);
  console.log("Seeded 5 categories + 9 products");

  const storage = await deleteBlockedStorageRoots();
  console.log("Storage cleanup:", storage);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
