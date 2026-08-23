/**
 * Verify StorePage legal content for HAGOUR store.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

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
  const pages = await prisma.storePage.findMany({
    where: { storeId: STORE_ID },
    select: { slug: true, title: true, isPublished: true, updatedAt: true, contentHe: true },
  });
  for (const p of pages) {
    const he = p.contentHe || "";
    console.log(
      JSON.stringify({
        slug: p.slug,
        title: p.title,
        published: p.isPublished,
        updatedAt: p.updatedAt?.toISOString(),
        hasCompany: he.includes("אמין בריזינטים"),
        hasHp: he.includes("516025954"),
        hasDate: he.includes("16.6.2026"),
        hasOldDomain: /www\.hagor\.co\.il/i.test(he),
        hasNewDomain: he.includes("https://hagourbywael.com/"),
        hasPhone: he.includes("054-779-3580"),
        len: he.length,
      }),
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
