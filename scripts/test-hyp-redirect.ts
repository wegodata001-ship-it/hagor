/**
 * Safe Hyp Pay connectivity test — APISign only (no card charge).
 * Does not print secrets. Leaves order UNPAID.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DeliveryType, OrderPaymentStatus, OrderStatus, Prisma, PrismaClient } from "@prisma/client";

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
const HYP_BASE = (process.env.HYP_BASE_URL?.trim() || "https://pay.hyp.co.il/p/").replace(/\/?$/, "/");
const prisma = new PrismaClient();

function presence(k: string) {
  return process.env[k]?.trim() ? "EXISTS" : "MISSING";
}

function stripSecrets(query: string): string {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  params.delete("KEY");
  params.delete("PassP");
  params.delete("Passp");
  params.delete("passP");
  return params.toString();
}

async function main() {
  console.log("ENV CHECK");
  console.log(
    JSON.stringify(
      {
        HYP_API_KEY: presence("HYP_API_KEY"),
        HYP_PASSP: presence("HYP_PASSP"),
        HYP_MASOF: presence("HYP_MASOF"),
        PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER?.trim() || "MISSING",
        ALLOW_DEMO_PAYMENT: process.env.ALLOW_DEMO_PAYMENT?.trim() || "MISSING",
        NEXT_PUBLIC_ALLOW_DEMO_PAYMENT: process.env.NEXT_PUBLIC_ALLOW_DEMO_PAYMENT?.trim() || "MISSING",
        storeId: STORE_ID,
      },
      null,
      2,
    ),
  );

  const apiKey = process.env.HYP_API_KEY?.trim();
  const passP = process.env.HYP_PASSP?.trim();
  const masof = process.env.HYP_MASOF?.trim();
  if (!apiKey || !passP || !masof) {
    console.log("FAIL: MISSING_ENV");
    process.exit(2);
  }
  if ((process.env.PAYMENT_PROVIDER || "").trim().toLowerCase() !== "hyp") {
    console.log("FAIL: PAYMENT_PROVIDER is not hyp");
    process.exit(2);
  }
  if ((process.env.ALLOW_DEMO_PAYMENT || "").trim().toLowerCase() !== "false") {
    console.log("FAIL: ALLOW_DEMO_PAYMENT must be false");
    process.exit(2);
  }

  const product = await prisma.product.findFirst({
    where: { storeId: STORE_ID, active: true, stock: { gt: 0 } },
    select: { id: true, price: true, name_he: true },
  });
  if (!product) throw new Error("No active product");

  const delivery = await prisma.deliveryOption.findFirst({
    where: { storeId: STORE_ID, active: true },
    select: { name_he: true, type: true },
  });
  if (!delivery) throw new Error("No delivery option");

  const amount = Math.round(Number(product.price) * 100) / 100;
  const orderNumber = `HYP-TEST-${Date.now().toString(36).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      storeId: STORE_ID,
      orderNumber,
      customerName: "Hyp Redirect Test",
      customerEmail: "hyp-redirect-test@hagourbywael.com",
      customerPhone: "0500000000",
      status: OrderStatus.PENDING,
      paymentStatus: OrderPaymentStatus.UNPAID,
      subtotal: new Prisma.Decimal(amount),
      deliveryPrice: new Prisma.Decimal(0),
      discountAmount: new Prisma.Decimal(0),
      pointsDiscountAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(amount),
      deliveryOptionName: delivery.name_he,
      deliveryOptionType: delivery.type as DeliveryType,
      deliveryOptionPrice: new Prisma.Decimal(0),
      notes: "AUTO_HYP_REDIRECT_TEST_DO_NOT_CHARGE",
      items: {
        create: [
          {
            storeId: STORE_ID,
            productId: product.id,
            productName: product.name_he,
            quantity: 1,
            unitPrice: new Prisma.Decimal(amount),
            totalPrice: new Prisma.Decimal(amount),
          },
        ],
      },
    },
    select: { id: true, storeId: true, status: true, paymentStatus: true, total: true, orderNumber: true },
  });

  console.log("ORDER");
  console.log(
    JSON.stringify(
      {
        id: order.id,
        storeId: order.storeId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
        orderNumber: order.orderNumber,
      },
      null,
      2,
    ),
  );

  if (order.storeId !== "hagor") {
    console.log("FAIL: STORE_MISMATCH");
    process.exit(3);
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
  signParams.set("Amount", String(amount));
  signParams.set("Order", order.id);
  signParams.set("Info", `HAGOUR ${order.orderNumber}`);
  signParams.set("ClientName", "Hyp");
  signParams.set("ClientLName", "Test");
  signParams.set("email", "hyp-redirect-test@hagourbywael.com");
  signParams.set("cell", "0500000000");
  signParams.set("UserId", "000000000");
  signParams.set("SuccessUrl", `https://hagourbywael.com/api/payments/hyp/return?storeId=hagor`);
  signParams.set("ErrorUrl", `https://hagourbywael.com/payment/failed?orderId=${encodeURIComponent(order.id)}`);
  signParams.set("Fild1", STORE_ID);
  signParams.set("Fild2", order.orderNumber);
  signParams.set("Fild3", order.id);

  const signUrl = `${HYP_BASE}?${signParams.toString()}`;
  const res = await fetch(signUrl, { method: "GET", cache: "no-store" });
  const raw = (await res.text()).trim();

  if (!res.ok) {
    console.log("HYP_SESSION_FAIL");
    console.log(`HTTP ${res.status}`);
    process.exit(4);
  }

  if (!/signature=/i.test(raw) && !/action=pay/i.test(raw)) {
    console.log("HYP_SESSION_FAIL");
    // Print only safe error fragment (no KEY/PassP)
    const safe = stripSecrets(raw).slice(0, 200);
    console.log(safe || "empty/unexpected response");
    process.exit(4);
  }

  const safeQuery = stripSecrets(raw);
  const redirectUrl = `${HYP_BASE}?${safeQuery}`;
  const host = new URL(redirectUrl).host;
  const hostOk = /pay\.hyp\.co\.il/i.test(host) || /yaad\.net/i.test(host);
  const hasSignature = /signature=/i.test(redirectUrl);
  const hasActionPay = /action=pay/i.test(redirectUrl);
  const leakedSecret = /(?:^|[?&])(?:PassP|KEY)=/i.test(redirectUrl);

  console.log("HYP_SESSION");
  console.log(
    JSON.stringify(
      {
        host,
        hostOk,
        hasSignature,
        hasActionPay,
        leakedSecret,
        httpStatus: res.status,
      },
      null,
      2,
    ),
  );

  const after = await prisma.order.findFirst({
    where: { id: order.id, storeId: STORE_ID },
    select: { status: true, paymentStatus: true, inventoryReducedAt: true },
  });
  console.log("ORDER_AFTER_SESSION", after);

  if (!hostOk || !hasSignature || leakedSecret || after?.paymentStatus !== "UNPAID" || after.status !== "PENDING") {
    console.log("RESULT: FAIL");
    process.exit(5);
  }

  console.log("RESULT: READY_FOR_LIVE_PAYMENT_TEST");
  console.log(`TEST_ORDER_ID=${order.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
