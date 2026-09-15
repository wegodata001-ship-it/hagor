/**
 * Read-only check — does not modify HAGOR-1016.
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

async function main() {
  const o = await prisma.order.findFirst({
    where: { storeId: "hagor", orderNumber: "HAGOR-1016" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
    },
  });
  if (!o) {
    console.log(JSON.stringify({ found: false }));
    return;
  }
  const payments = await prisma.payment.count({ where: { storeId: "hagor", orderId: o.id } });
  const webhookLogs = await prisma.paymentWebhookLog.count({
    where: { storeId: "hagor", orderId: o.id },
  });
  let paymentAttempts: number | string = 0;
  try {
    paymentAttempts = await prisma.paymentAttempt.count({
      where: { storeId: "hagor", orderId: o.id },
    });
  } catch {
    paymentAttempts = "TABLE_MISSING";
  }
  console.log(
    JSON.stringify(
      {
        found: true,
        order: o,
        payments,
        webhookLogs,
        paymentAttempts,
        changed: false,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
