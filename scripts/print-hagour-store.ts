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
  const store = await prisma.store.findUnique({
    where: { id: STORE_ID },
    select: { id: true, slug: true, name: true, domain: true },
  });
  if (store && !store.domain) {
    await prisma.store.update({
      where: { id: STORE_ID },
      data: { domain: "hagourbywael.com" },
    });
  }
  const storeAfter = await prisma.store.findUnique({
    where: { id: STORE_ID },
    select: { id: true, slug: true, name: true, domain: true },
  });
  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: { paymentProvider: true, currency: true },
  });
  console.log(
    JSON.stringify(
      {
        store: storeAfter,
        settings,
        env: {
          PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER ?? null,
          ALLOW_DEMO_PAYMENT: process.env.ALLOW_DEMO_PAYMENT ?? null,
          NEXT_PUBLIC_ALLOW_DEMO_PAYMENT: process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENT ?? null,
          NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
          HYP_USER: process.env.HYP_USER ? "[set]" : null,
          HYP_PASSWORD: process.env.HYP_PASSWORD ? "[set]" : null,
          HYP_TERMINAL_NUMBER: process.env.HYP_TERMINAL_NUMBER ? "[set]" : null,
          HYP_MID: process.env.HYP_MID ? "[set]" : null,
          HYP_RELAY_URL: process.env.HYP_RELAY_URL ?? null,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
