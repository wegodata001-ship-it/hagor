import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
const orderId = "cmu1ppqor0001a7ddq0bmg5vh";

async function main() {
  const log = await prisma.paymentWebhookLog.findFirst({
    where: { storeId: "hagor", orderId },
    orderBy: { createdAt: "desc" },
  });
  const raw = (log?.rawPayload || {}) as Record<string, string>;
  const keys = Object.keys(raw);
  const replayable = Boolean(raw.Id && raw.Sign && raw.Order && raw.Amount && raw.CCode);
  writeFileSync(
    join(root, ".tmp-hyp-replay-payload.json"),
    JSON.stringify(raw, null, 2),
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        logStatus: log?.status,
        error: log?.errorMessage,
        keyCount: keys.length,
        hasId: Boolean(raw.Id),
        hasSign: Boolean(raw.Sign),
        hasOrder: Boolean(raw.Order),
        hasAmount: Boolean(raw.Amount),
        hasCCode: Boolean(raw.CCode),
        replayable,
        // presence only — do not print Sign/Id values
        Order: raw.Order || null,
        Amount: raw.Amount || null,
        CCode: raw.CCode || null,
        Fild1: raw.Fild1 || null,
        Fild2Present: Boolean(raw.Fild2),
        Fild3: raw.Fild3 || null,
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
