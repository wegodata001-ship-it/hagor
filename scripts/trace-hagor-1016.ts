/**
 * Trace HAGOR-1016 — read only. No status mutations.
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

async function main() {
  const order = await prisma.order.findFirst({
    where: { storeId: STORE_ID, orderNumber: "HAGOR-1016" },
    include: {
      items: true,
      payments: true,
    },
  });
  console.log(
    "ORDER",
    JSON.stringify(
      order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: Number(order.total),
            paymentStatus: order.paymentStatus,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map((i) => ({
              productName: i.productName,
              quantity: i.quantity,
              totalPrice: Number(i.totalPrice),
            })),
            payments: order.payments.map((p) => ({
              id: p.id,
              provider: p.provider,
              amount: Number(p.amount),
              status: p.status,
              transactionId: p.transactionId,
              confirmationNumber: p.confirmationNumber,
              createdAt: p.createdAt,
              rawPayload: p.rawPayload,
            })),
          }
        : null,
      null,
      2,
    ),
  );

  if (!order) return;

  const logs = await prisma.paymentWebhookLog.findMany({
    where: {
      storeId: STORE_ID,
      OR: [
        { orderId: order.id },
        { orderId: order.orderNumber },
        {
          createdAt: {
            gte: new Date("2026-09-14T00:00:00.000Z"),
            lte: new Date("2026-09-14T23:59:59.999Z"),
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    "WEBHOOK_LOGS",
    JSON.stringify(
      logs.map((l) => ({
        id: l.id,
        provider: l.provider,
        orderId: l.orderId,
        status: l.status,
        httpStatus: l.httpStatus,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt,
        rawPayload: l.rawPayload,
      })),
      null,
      2,
    ),
  );

  const nearby = await prisma.order.findMany({
    where: {
      storeId: STORE_ID,
      createdAt: {
        gte: new Date("2026-09-14T00:00:00.000Z"),
        lte: new Date("2026-09-14T23:59:59.999Z"),
      },
    },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      total: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(
    "ORDERS_THAT_DAY",
    JSON.stringify(
      nearby.map((o) => ({
        ...o,
        total: Number(o.total),
      })),
      null,
      2,
    ),
  );

  const allPayments = await prisma.payment.findMany({
    where: {
      storeId: STORE_ID,
      createdAt: {
        gte: new Date("2026-09-14T00:00:00.000Z"),
        lte: new Date("2026-09-14T23:59:59.999Z"),
      },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(
    "PAYMENTS_THAT_DAY",
    JSON.stringify(
      allPayments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        provider: p.provider,
        amount: Number(p.amount),
        status: p.status,
        transactionId: p.transactionId,
        confirmationNumber: p.confirmationNumber,
        createdAt: p.createdAt,
        rawPayload: p.rawPayload,
      })),
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
