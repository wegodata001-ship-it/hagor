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

function presence(k: string): "EXISTS" | "MISSING" {
  return process.env[k]?.trim() ? "EXISTS" : "MISSING";
}

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID?.trim() || "hagor";
const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.findUnique({
    where: { id: STORE_ID },
    select: { id: true, slug: true, name: true, domain: true },
  });

  const apiKey = presence("HYP_API_KEY");
  const passP = presence("HYP_PASSP");
  const masof = presence("HYP_MASOF");
  const missing = [
    apiKey === "MISSING" ? "HYP_API_KEY" : null,
    passP === "MISSING" ? "HYP_PASSP" : null,
    masof === "MISSING" ? "HYP_MASOF" : null,
  ].filter(Boolean);

  console.log("HYP CONNECTION AUDIT");
  console.log(
    JSON.stringify(
      {
        store,
        HAGOUR_STORE_ID: store?.id ?? null,
        Environment: {
          HYP_API_KEY: apiKey,
          HYP_PASSP: passP,
          HYP_MASOF: masof,
          HYP_WEBHOOK_SECRET: presence("HYP_WEBHOOK_SECRET"),
          PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER?.trim() || "MISSING",
          ALLOW_DEMO_PAYMENT: process.env.ALLOW_DEMO_PAYMENT?.trim() || "MISSING",
          NEXT_PUBLIC_ALLOW_DEMO_PAYMENT: process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENT?.trim() || "MISSING",
          NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "MISSING",
          NEXT_PUBLIC_HYP_API_KEY: presence("NEXT_PUBLIC_HYP_API_KEY") === "EXISTS" ? "LEAK_RISK" : "OK_ABSENT",
          NEXT_PUBLIC_HYP_PASSP: presence("NEXT_PUBLIC_HYP_PASSP") === "EXISTS" ? "LEAK_RISK" : "OK_ABSENT",
        },
        hypConfigured: missing.length === 0,
        missing,
      },
      null,
      2,
    ),
  );

  if (missing.length) {
    console.log("\nMISSING HYP CONFIG:");
    for (const f of missing) console.log(`- ${f}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
