/**
 * Upsert HAGOUR ₪3 test product for Hyp/checkout live tests.
 * Usage: npx tsx scripts/add-test-product-3ils.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { hagourCategoryId } from "../src/lib/hagour-catalog";

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

const STORE_ID = "hagor";
const SKU = "TEST-HAGOUR-3ILS";
const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findUnique({ where: { id: STORE_ID }, select: { id: true, name: true } });
  if (!store) throw new Error(`Store ${STORE_ID} not found`);

  // Prefer accessories (general); fall back to any active hagor category.
  const preferredId = hagourCategoryId(STORE_ID, "accessories");
  let category =
    (await prisma.category.findFirst({
      where: { storeId: STORE_ID, id: preferredId, active: true },
      select: { id: true, name_he: true },
    })) ||
    (await prisma.category.findFirst({
      where: { storeId: STORE_ID, active: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name_he: true },
    }));

  if (!category) throw new Error("No active category found for hagor");

  const product = await prisma.product.upsert({
    where: { storeId_sku: { storeId: STORE_ID, sku: SKU } },
    create: {
      storeId: STORE_ID,
      categoryId: category.id,
      sku: SKU,
      name_he: "מוצר בדיקה ₪3",
      name_ar: "منتج تجريبي 3 شيكل",
      name_en: "Test Product ₪3",
      description_he: "מוצר בדיקה בלבד לצורך בדיקת סל קניות ותשלום. לא מוצר אמיתי למכירה.",
      description_ar: "منتج تجريبي فقط لفحص السلة والدفع. ليس منتجًا حقيقيًا للبيع.",
      description_en: "Test product only for checkout and payment testing. Not a real retail product.",
      price: new Prisma.Decimal("3.00"),
      stock: 100,
      active: true,
      featured: false,
    },
    update: {
      categoryId: category.id,
      name_he: "מוצר בדיקה ₪3",
      name_ar: "منتج تجريبي 3 شيكل",
      name_en: "Test Product ₪3",
      description_he: "מוצר בדיקה בלבד לצורך בדיקת סל קניות ותשלום. לא מוצר אמיתי למכירה.",
      description_ar: "منتج تجريبي فقط لفحص السلة والدفع. ليس منتجًا حقيقيًا للبيع.",
      description_en: "Test product only for checkout and payment testing. Not a real retail product.",
      price: new Prisma.Decimal("3.00"),
      stock: 100,
      active: true,
      featured: false,
    },
    select: {
      id: true,
      storeId: true,
      sku: true,
      name_he: true,
      name_en: true,
      price: true,
      stock: true,
      active: true,
      featured: true,
      categoryId: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        created: true,
        productId: product.id,
        storeId: product.storeId,
        name: product.name_he,
        nameEn: product.name_en,
        price: Number(product.price),
        stock: product.stock,
        sku: product.sku,
        active: product.active,
        featured: product.featured,
        categoryId: product.categoryId,
        categoryName: category.name_he,
        urlPath: `/products/${product.id}`,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
