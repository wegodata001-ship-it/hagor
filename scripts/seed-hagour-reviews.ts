/**
 * Seed default HAGOUR customer reviews (approved).
 * Usage: npx tsx scripts/seed-hagour-reviews.ts
 */
import { HAGOUR_DEFAULT_REVIEWS } from "../src/lib/hagour-reviews-default";
import { createScriptPrisma } from "../src/lib/script-prisma";

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";
const prisma = createScriptPrisma();

async function main() {
  const count = await prisma.review.count({ where: { storeId: STORE_ID } });
  if (count > 0) {
    console.log(`Store ${STORE_ID} already has ${count} reviews — skip (delete first to re-seed).`);
    return;
  }

  for (const r of HAGOUR_DEFAULT_REVIEWS) {
    await prisma.review.create({
      data: {
        storeId: STORE_ID,
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        sortOrder: r.sortOrder,
        isApproved: true,
      },
    });
  }

  console.log(`Seeded ${HAGOUR_DEFAULT_REVIEWS.length} reviews for ${STORE_ID}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
