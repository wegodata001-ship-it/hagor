/**
 * Add missing columns/tables without db push data loss.
 * Usage: npx tsx scripts/apply-safe-db-sync.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createScriptPrisma } from "../src/lib/script-prisma";

const prisma = createScriptPrisma({ forMigration: true });

function statementsFromSql(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter((s) => s.length > 0);
}

async function main() {
  const path = join(process.cwd(), "prisma", "safe-additive-sync.sql");
  const sql = readFileSync(path, "utf8");
  const statements = statementsFromSql(sql);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      console.log("OK:", statement.slice(0, 72).replace(/\s+/g, " "));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("SKIP (exists):", statement.slice(0, 60));
        continue;
      }
      throw e;
    }
  }

  console.log("Safe additive sync finished.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
