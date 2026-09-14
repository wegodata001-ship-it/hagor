/**
 * Presence-only production credit-flow precheck. No card charge. No secrets printed.
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

const prisma = new PrismaClient();
const STORE_ID = "hagor";
const SKU = "TEST-HAGOUR-3ILS";

function presence(k: string) {
  return process.env[k]?.trim() ? "EXISTS" : "MISSING";
}

async function main() {
  console.log("ENV");
  console.log(
    JSON.stringify(
      {
        HYP_API_KEY: presence("HYP_API_KEY"),
        HYP_PASSP: presence("HYP_PASSP"),
        HYP_MASOF: presence("HYP_MASOF"),
        PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER?.trim() || "MISSING",
        ALLOW_DEMO_PAYMENT: process.env.ALLOW_DEMO_PAYMENT?.trim() || "MISSING",
        NEXT_PUBLIC_ALLOW_DEMO_PAYMENT: process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENT?.trim() || "MISSING",
      },
      null,
      2,
    ),
  );

  const product = await prisma.product.findFirst({
    where: { storeId: STORE_ID, sku: SKU },
    select: {
      id: true,
      storeId: true,
      name_he: true,
      price: true,
      stock: true,
      active: true,
      sku: true,
      categoryId: true,
    },
  });
  console.log("PRODUCT", JSON.stringify(product ? { ...product, price: Number(product.price) } : null, null, 2));

  const delivery = await prisma.deliveryOption.findMany({
    where: { storeId: STORE_ID, active: true },
    select: { id: true, name_he: true, type: true, price: true, active: true },
    orderBy: { sortOrder: "asc" },
  });
  console.log(
    "DELIVERY",
    JSON.stringify(
      delivery.map((d) => ({ ...d, price: Number(d.price) })),
      null,
      2,
    ),
  );

  const healthRes = await fetch("https://hagourbywael.com/api/health", { cache: "no-store" });
  const health = (await healthRes.json()) as {
    storeId?: string;
    hyp?: { provider?: string; configured?: boolean };
    ok?: boolean;
  };
  console.log(
    "HEALTH",
    JSON.stringify(
      {
        ok: health.ok,
        storeId: health.storeId,
        provider: health.hyp?.provider,
        configured: health.hyp?.configured,
      },
      null,
      2,
    ),
  );

  if (!product || Number(product.price) !== 3 || !product.active) {
    console.log("HYP_SESSION skipped — test product invalid");
    return;
  }

  const apiKey = process.env.HYP_API_KEY?.trim();
  const passP = process.env.HYP_PASSP?.trim();
  const masof = process.env.HYP_MASOF?.trim();
  const HYP_BASE = (process.env.HYP_BASE_URL?.trim() || "https://pay.hyp.co.il/p/").replace(/\/?$/, "/");
  if (!apiKey || !passP || !masof) {
    console.log("HYP_SESSION FAIL MISSING_ENV");
    return;
  }

  const signParams = new URLSearchParams();
  signParams.set("action", "APISign");
  signParams.set("What", "SIGN");
  signParams.set("Sign", "True");
  signParams.set("MoreData", "True");
  signParams.set("UTF8", "True");
  signParams.set("Coin", "1");
  signParams.set("PageLang", "HEB");
  signParams.set("Masof", masof);
  signParams.set("KEY", apiKey);
  signParams.set("PassP", passP);
  signParams.set("Amount", "3");
  signParams.set("Order", "CREDIT-FLOW-PRECHECK");
  signParams.set("Info", "HAGOUR TEST 3ILS");
  signParams.set("SuccessUrl", "https://hagourbywael.com/api/payments/hyp/return?storeId=hagor");
  signParams.set("Fild1", STORE_ID);

  const res = await fetch(`${HYP_BASE}?${signParams.toString()}`, { method: "GET", cache: "no-store" });
  const raw = (await res.text()).trim();
  const hostOk = /pay\.hyp\.co\.il/i.test(HYP_BASE);
  const hasSignature = /signature=/i.test(raw);
  const hasActionPay = /action=pay/i.test(raw);
  const leaked = /(?:^|[?&])(?:PassP|KEY)=/i.test(raw.replace(/KEY=[^&]+/gi, "").replace(/PassP=[^&]+/gi, "") + (hasSignature ? "&action=pay" : ""));
  console.log(
    "HYP_SESSION",
    JSON.stringify(
      {
        httpStatus: res.status,
        host: "pay.hyp.co.il",
        hostOk,
        hasSignature,
        hasActionPay,
        amountSent: 3,
        charged: false,
      },
      null,
      2,
    ),
  );
  void leaked;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
