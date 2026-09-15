/**
 * After empty GET/POST to public return — confirm no PAID side effects on HAGOR-1016.
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
    select: { id: true, status: true, paymentStatus: true },
  });
  const payments = o
    ? await prisma.payment.count({ where: { storeId: "hagor", orderId: o.id } })
    : null;
  const recentLogs = await prisma.paymentWebhookLog.findMany({
    where: { storeId: "hagor", provider: "hyp", createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, orderId: true, status: true, errorMessage: true, createdAt: true },
  });
  console.log(
    JSON.stringify(
      {
        hagor1016: o,
        payments,
        recentHypLogs: recentLogs.map((l) => ({
          status: l.status,
          orderId: l.orderId,
          error: l.errorMessage,
          at: l.createdAt,
        })),
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
