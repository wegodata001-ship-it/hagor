/**
 * Admin annotation only — does NOT mark PAID.
 * Sets REQUIRES_RECONCILIATION on HAGOR-1016 notes while keeping UNPAID/PENDING.
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

const FLAG =
  "[ADMIN] REQUIRES_RECONCILIATION — customer reported Hyp success UI; HAGOR never received /api/payments/hyp/return. Do NOT treat as PAID until official Hyp TransId + VERIFY. paymentStatus remains UNPAID.";

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { storeId: "hagor", orderNumber: "HAGOR-1016" },
    select: { id: true, status: true, paymentStatus: true, notes: true },
  });
  if (!order) {
    console.log(JSON.stringify({ ok: false, reason: "not_found" }));
    return;
  }
  if (order.paymentStatus !== "UNPAID" || order.status !== "PENDING") {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "unexpected_status",
        status: order.status,
        paymentStatus: order.paymentStatus,
      }),
    );
    return;
  }
  if ((order.notes || "").includes("REQUIRES_RECONCILIATION")) {
    console.log(
      JSON.stringify({
        ok: true,
        alreadyFlagged: true,
        status: order.status,
        paymentStatus: order.paymentStatus,
      }),
    );
    return;
  }
  const nextNotes = [order.notes?.trim(), FLAG].filter(Boolean).join("\n");
  await prisma.order.update({
    where: { id: order.id },
    data: { notes: nextNotes },
  });
  const after = await prisma.order.findFirst({
    where: { id: order.id },
    select: { status: true, paymentStatus: true, notes: true },
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        flagged: true,
        status: after?.status,
        paymentStatus: after?.paymentStatus,
        hasRequiresReconciliation: (after?.notes || "").includes("REQUIRES_RECONCILIATION"),
        paidClaimed: false,
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
