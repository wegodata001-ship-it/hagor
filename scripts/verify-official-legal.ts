/**
 * Compare official source text to stored HTML / rendered text.
 * Usage: npx tsx scripts/verify-official-legal.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { OFFICIAL_LEGAL_DOCS } from "../src/lib/hagour-official-legal";
import { parseOfficialLegalHtml } from "../src/lib/parse-official-legal";

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

function normalize(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstDiff(a: string, b: string): string | null {
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      return `at ${i}: source="${a.slice(Math.max(0, i - 20), i + 30)}" vs html="${b.slice(Math.max(0, i - 20), i + 30)}"`;
    }
  }
  return null;
}

async function main() {
  let failed = 0;
  for (const doc of OFFICIAL_LEGAL_DOCS) {
    const htmlNorm = normalize(doc.html);
    const sourceNorm = normalize(doc.sourceText);
    const parsed = parseOfficialLegalHtml(doc.html);
    const rendered = normalize(
      [parsed.brand, parsed.company, parsed.hp, parsed.updated, parsed.title, parsed.bodyHtml].join(" "),
    );

    const htmlOk = htmlNorm === sourceNorm;
    const renderOk = rendered === sourceNorm;
    if (!htmlOk || !renderOk) {
      failed += 1;
      console.error(`FAIL ${doc.slug}`);
      if (!htmlOk) console.error("  HTML:", firstDiff(sourceNorm, htmlNorm));
      if (!renderOk) console.error("  RENDER:", firstDiff(sourceNorm, rendered));
    } else {
      console.log(`OK source↔html ${doc.slug} (${sourceNorm.length} chars)`);
    }

    const row = await prisma.storePage.findUnique({
      where: { storeId_slug: { storeId: STORE_ID, slug: doc.slug } },
      select: { storeId: true, contentHe: true, title: true, isPublished: true },
    });
    if (!row) {
      failed += 1;
      console.error(`FAIL ${doc.slug}: missing DB row for store ${STORE_ID}`);
      continue;
    }
    if (row.storeId !== STORE_ID) {
      failed += 1;
      console.error(`FAIL ${doc.slug}: storeId mismatch ${row.storeId}`);
    }
    const dbNorm = normalize(row.contentHe ?? "");
    if (dbNorm !== sourceNorm) {
      failed += 1;
      console.error(`FAIL ${doc.slug} DB:`, firstDiff(sourceNorm, dbNorm));
    } else {
      console.log(`OK source↔DB ${doc.slug} published=${row.isPublished}`);
    }
  }

  if (failed) {
    console.error(`Verification failed: ${failed} issues`);
    process.exit(1);
  }
  console.log(`All 6 official legal documents match the source for store ${STORE_ID}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
