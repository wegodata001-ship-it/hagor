/**
 * Controlled Hyp Portal return test — ONE unpaid order + live SIGN (production SuccessUrl).
 * Does NOT migrate PaymentAttempt. Does NOT touch HAGOR-1016. Does NOT mark PAID.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DeliveryType,
  OrderPaymentStatus,
  OrderStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

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
const SUCCESS_URL = "https://hagourbywael.com/api/payments/hyp/return";
const prisma = new PrismaClient();
const STATE_FILE = join(root, ".tmp-hyp-portal-return-test.json");

function stripSecrets(query: string): string {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  for (const k of ["KEY", "PassP", "Passp", "passP", "password", "Password"]) {
    params.delete(k);
  }
  return params.toString();
}

async function snapshot(orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: STORE_ID },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      paymentStatus: true,
      notes: true,
      inventoryReducedAt: true,
    },
  });
  const paymentsCount = await prisma.payment.count({
    where: { storeId: STORE_ID, orderId },
  });
  const payments = await prisma.payment.findMany({
    where: { storeId: STORE_ID, orderId },
    select: {
      id: true,
      status: true,
      amount: true,
      transactionId: true,
      createdAt: true,
    },
  });
  const webhookLogs = await prisma.paymentWebhookLog.findMany({
    where: { storeId: STORE_ID, orderId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      status: true,
      errorMessage: true,
      createdAt: true,
      rawPayload: true,
    },
  });
  return { order, paymentsCount, payments, webhookLogs };
}

function safeLogSummary(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ingress = (o._ingress as Record<string, unknown> | undefined) || undefined;
  return {
    hasId: Boolean(o.Id || o.id || ingress?.hasId),
    hasSign: Boolean(o.Sign || o.sign || o.signature || ingress?.hasSign),
    CCode: (o.CCode as string) || (o.ccode as string) || (ingress?.CCode as string) || null,
    hasAmount: Boolean(o.Amount || o.amount),
    hasOrder: Boolean(o.Order || o.order || o.Fild3 || o.orderId),
    method: (ingress?.method as string) || null,
    keys: Object.keys(o)
      .filter((k) => !/^(KEY|PassP|Passp|signature|Sign)$/i.test(k) && !k.startsWith("_"))
      .slice(0, 20),
  };
}

async function createHypPayUrl(order: {
  id: string;
  orderNumber: string;
  amount: number;
}): Promise<{ redirectUrl: string; successUrl: string; echoedSuccessUrl: string | null }> {
  const apiKey = process.env.HYP_API_KEY!.trim();
  const passP = process.env.HYP_PASSP!.trim();
  const masof = process.env.HYP_MASOF!.trim();
  const failUrl = `https://hagourbywael.com/payment/failed?orderId=${encodeURIComponent(order.id)}`;

  const signParams = new URLSearchParams();
  signParams.set("action", "APISign");
  signParams.set("What", "SIGN");
  signParams.set("Sign", "True");
  signParams.set("MoreData", "True");
  signParams.set("UTF8", "True");
  signParams.set("UTF8out", "True");
  signParams.set("Coin", "1");
  signParams.set("PageLang", "HEB");
  signParams.set("Masof", masof);
  signParams.set("KEY", apiKey);
  signParams.set("PassP", passP);
  signParams.set("Amount", String(order.amount));
  signParams.set("Order", order.id);
  signParams.set("Info", `HAGOUR ${order.orderNumber}`);
  signParams.set("ClientName", "HYP");
  signParams.set("ClientLName", "ReturnTest");
  signParams.set("email", "hyp-return-test@hagourbywael.com");
  signParams.set("cell", "0500000001");
  signParams.set("UserId", "000000000");
  // Production SuccessUrl — no query string (Hyp appends ?Id=&Sign=…)
  signParams.set("SuccessUrl", SUCCESS_URL);
  signParams.set("ErrorUrl", failUrl);
  signParams.set("CancelUrl", failUrl);
  signParams.set("Fild1", STORE_ID);
  signParams.set("Fild2", order.orderNumber);
  signParams.set("Fild3", order.id);

  const res = await fetch(`${HYP_BASE}?${signParams.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  const raw = (await res.text()).trim();
  if (!res.ok || (!/signature=/i.test(raw) && !/action=pay/i.test(raw))) {
    throw new Error(`Hyp SIGN failed HTTP ${res.status}: ${stripSecrets(raw).slice(0, 160)}`);
  }
  const map = Object.fromEntries(new URLSearchParams(raw));
  const echoedSuccessUrl = map.SuccessUrl || map.successUrl || null;
  const redirectUrl = `${HYP_BASE}?${stripSecrets(raw)}`;
  return { redirectUrl, successUrl: SUCCESS_URL, echoedSuccessUrl };
}

async function main() {
  const mode = process.argv[2] || "initiate";

  if (mode === "status") {
    if (!existsSync(STATE_FILE)) {
      console.log(JSON.stringify({ error: "no_state_file" }));
      return;
    }
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as {
      orderId: string;
      orderNumber: string;
      amount: number;
      successUrl: string;
    };
    const snap = await snapshot(state.orderId);
    const o1016 = await prisma.order.findFirst({
      where: { storeId: STORE_ID, orderNumber: "HAGOR-1016" },
      select: { id: true, status: true, paymentStatus: true },
    });
    const payments1016 = o1016
      ? await prisma.payment.count({ where: { storeId: STORE_ID, orderId: o1016.id } })
      : null;

    console.log(
      JSON.stringify(
        {
          testOrder: {
            orderId: state.orderId,
            orderNumber: state.orderNumber,
            amount: state.amount,
            successUrl: state.successUrl,
          },
          after: {
            status: snap.order?.status,
            paymentStatus: snap.order?.paymentStatus,
            paymentsCount: snap.paymentsCount,
            inventoryReducedAt: snap.order?.inventoryReducedAt ?? null,
            paymentIds: snap.payments.map((p) => ({
              status: p.status,
              amount: Number(p.amount),
              hasTransactionId: Boolean(p.transactionId),
              at: p.createdAt,
            })),
          },
          webhookLogs: snap.webhookLogs.map((l) => ({
            status: l.status,
            error: l.errorMessage,
            at: l.createdAt,
            safe: safeLogSummary(l.rawPayload),
          })),
          hagor1016: {
            status: o1016?.status,
            paymentStatus: o1016?.paymentStatus,
            paymentsCount: payments1016,
            unchanged:
              o1016?.status === "PENDING" &&
              o1016?.paymentStatus === "UNPAID" &&
              payments1016 === 0,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!process.env.HYP_API_KEY?.trim() || !process.env.HYP_PASSP?.trim() || !process.env.HYP_MASOF?.trim()) {
    throw new Error("Missing Hyp credentials in env");
  }

  const product = await prisma.product.findFirst({
    where: { storeId: STORE_ID, active: true, stock: { gt: 0 } },
    orderBy: { price: "asc" },
    select: { id: true, price: true, name_he: true },
  });
  if (!product) throw new Error("No active product with stock");

  const delivery =
    (await prisma.deliveryOption.findFirst({
      where: { storeId: STORE_ID, active: true, type: "PICKUP" },
      select: { name_he: true, type: true },
    })) ||
    (await prisma.deliveryOption.findFirst({
      where: { storeId: STORE_ID, active: true },
      select: { name_he: true, type: true },
    }));
  if (!delivery) throw new Error("No delivery option");

  // Fixed ₪3 controlled charge (same as prior Hyp audits).
  const amount = 3;
  const stamp = Date.now().toString(36).toUpperCase();
  const orderNumber = `HAGOR-HYP-RET-${stamp}`;

  const order = await prisma.order.create({
    data: {
      storeId: STORE_ID,
      orderNumber,
      customerName: "HYP RETURN TEST",
      customerEmail: "hyp-return-test@hagourbywael.com",
      customerPhone: "0500000001",
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
      notes: "HYP RETURN TEST — Portal custom success URL verification. Controlled single charge.",
      items: {
        create: [
          {
            storeId: STORE_ID,
            productId: product.id,
            productName: `[HYP RETURN TEST] ${product.name_he}`,
            quantity: 1,
            unitPrice: new Prisma.Decimal(amount),
            totalPrice: new Prisma.Decimal(amount),
          },
        ],
      },
    },
    select: { id: true, orderNumber: true, total: true, status: true, paymentStatus: true },
  });

  const beforePayments = await prisma.payment.count({
    where: { storeId: STORE_ID, orderId: order.id },
  });

  const before = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: Number(order.total),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentsCount: beforePayments,
  };
  console.log("BEFORE", JSON.stringify(before, null, 2));

  const session = await createHypPayUrl({
    id: order.id,
    orderNumber: order.orderNumber,
    amount: Number(order.total),
  });

  const initiate = {
    successUrlSent: session.successUrl,
    successUrlEchoed: session.echoedSuccessUrl,
    successUrlOk:
      session.successUrl === SUCCESS_URL &&
      (session.echoedSuccessUrl === SUCCESS_URL || session.echoedSuccessUrl == null),
    redirectHost: new URL(session.redirectUrl).host,
    hasPayAction: /action=pay/i.test(session.redirectUrl),
    leakedSecret: /(?:^|[?&])(?:PassP|KEY)=/i.test(session.redirectUrl),
  };
  console.log("INITIATE", JSON.stringify(initiate, null, 2));

  writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        ...before,
        successUrl: session.successUrl,
        echoedSuccessUrl: session.echoedSuccessUrl,
        redirectUrl: session.redirectUrl,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("PAYMENT_URL");
  console.log(session.redirectUrl);
  console.log("STATE_FILE", STATE_FILE);
  console.log("After paying in browser, run: npx tsx scripts/hyp-portal-return-live-test.ts status");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
