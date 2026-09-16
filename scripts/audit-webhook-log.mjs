// READ-ONLY audit of the last N PaymentWebhookLog rows.
// - Does NOT modify data.
// - Classifies each event into human meaning.
// - Prints a compact table.
//
// Usage:  node scripts/audit-webhook-log.mjs [N]

import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Tiny in-line env loader (no dotenv dependency).
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const N = Number(process.argv[2] || 40);
const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID || "hagor";

const prisma = new PrismaClient({ log: ["warn", "error"] });

function classify(row) {
  const s = row.status;
  const err = (row.errorMessage || "").toLowerCase();

  if (s === "PROCESSED") return { kind: "success", human: "Payment approved and recorded" };
  if (s === "DUPLICATE") return { kind: "duplicate", human: "Duplicate callback — no double charge" };
  if (s === "IGNORED") return { kind: "ignored", human: "Callback not relevant to a real order" };
  if (s === "RECEIVED") return { kind: "warn", human: "Received but processing did not complete" };

  // ERROR — classify by errorMessage.
  if (!err) return { kind: "warn", human: "Processing error (no message)" };
  if (err.includes("order_not_found")) return { kind: "warn", human: "Callback for an unknown order" };
  if (err.includes("store_mismatch")) return { kind: "warn", human: "Callback for another store" };
  if (err.includes("verify") || err.includes("sign") || err.includes("apisign"))
    return { kind: "warn", human: "Signature/verify failure (likely test call, no real payment made)" };
  if (err.includes("invalid") || err.includes("malformed") || err.includes("schema"))
    return { kind: "warn", human: "Malformed callback (bad body)" };
  if (err.includes("stale") || err.includes("expired"))
    return { kind: "warn", human: "Stale callback (order already handled)" };
  if (err.includes("amount")) return { kind: "warn", human: "Amount mismatch — needs review" };
  if (err.includes("failed") || err.includes("declined") || err.includes("ccode"))
    return { kind: "failed", human: "Payment not approved by acquirer" };
  return { kind: "warn", human: `Processing error: ${row.errorMessage?.slice(0, 80)}` };
}

async function main() {
  const rows = await prisma.paymentWebhookLog.findMany({
    where: { storeId: STORE_ID },
    orderBy: { createdAt: "desc" },
    take: N,
    select: {
      id: true,
      provider: true,
      status: true,
      orderId: true,
      httpStatus: true,
      errorMessage: true,
      createdAt: true,
      rawPayload: true,
    },
  });

  const orderIds = Array.from(new Set(rows.map((r) => r.orderId).filter(Boolean)));
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds }, storeId: STORE_ID },
        select: { id: true, orderNumber: true, customerName: true, total: true, paymentStatus: true },
      })
    : [];
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const summary = { PROCESSED: 0, DUPLICATE: 0, ERROR: 0, RECEIVED: 0, IGNORED: 0 };
  const errorsAffectingRealPayments = [];
  const errorsRequiringAction = [];

  for (const r of rows) {
    summary[r.status] = (summary[r.status] ?? 0) + 1;
    const o = r.orderId ? orderById.get(r.orderId) : null;
    const meaning = classify(r);

    if (r.status === "ERROR") {
      // Only "failed" kind = real payment issue affecting the customer.
      if (meaning.kind === "failed") {
        errorsAffectingRealPayments.push({
          id: r.id,
          when: r.createdAt.toISOString(),
          order: o?.orderNumber || r.orderId || null,
          err: r.errorMessage,
        });
      } else if (o && o.paymentStatus !== "PAID") {
        errorsRequiringAction.push({
          id: r.id,
          when: r.createdAt.toISOString(),
          order: o.orderNumber,
          status: o.paymentStatus,
          err: r.errorMessage,
        });
      }
    }

    const orderLabel = o ? `${o.orderNumber} (${o.paymentStatus})` : r.orderId ? `#${r.orderId.slice(0, 6)}` : "—";
    const amount = o?.total != null ? `₪${Number(o.total).toFixed(2)}` : "—";
    console.log(
      [
        r.createdAt.toISOString().replace("T", " ").slice(0, 19),
        r.provider.padEnd(6),
        r.status.padEnd(9),
        String(r.httpStatus ?? "").padStart(3),
        orderLabel.padEnd(28),
        amount.padStart(9),
        meaning.human,
      ].join(" │ "),
    );
  }

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\nErrors that affected real payments (declined by acquirer):");
  console.log(JSON.stringify(errorsAffectingRealPayments, null, 2));
  console.log("\nErrors on orders that are NOT paid (need review):");
  console.log(JSON.stringify(errorsRequiringAction, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
