/**
 * Inspect safe fields from latest webhook log for the portal return test order.
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
const state = JSON.parse(
  readFileSync(join(root, ".tmp-hyp-portal-return-test.json"), "utf8"),
) as { orderId: string };

async function main() {
  const log = await prisma.paymentWebhookLog.findFirst({
    where: { storeId: "hagor", orderId: state.orderId },
    orderBy: { createdAt: "desc" },
  });
  const raw = (log?.rawPayload || {}) as Record<string, unknown>;
  const safe = {
    CCode: raw.CCode ?? null,
    Amount: raw.Amount ?? null,
    Order: raw.Order ?? null,
    Fild1: raw.Fild1 ?? null,
    Fild2: raw.Fild2 ?? null,
    Fild3: raw.Fild3 ?? null,
    hasId: Boolean(raw.Id),
    hasSign: Boolean(raw.Sign),
    hasStoreIdParam: Boolean(raw.storeId),
    storeIdParam: raw.storeId ?? null,
    Brand: raw.Brand ?? null,
    Coin: raw.Coin ?? null,
    errorMessage: log?.errorMessage ?? null,
    status: log?.status ?? null,
  };
  console.log(JSON.stringify(safe, null, 2));
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
