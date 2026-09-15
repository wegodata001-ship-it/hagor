/**
 * Replay preserved Hyp return payload for HAGOR-HYP-RET test order.
 * Uses ONLY the stored PaymentWebhookLog rawPayload — no fabricated Sign/Id.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

async function main() {
  const payloadPath = join(root, ".tmp-hyp-replay-payload.json");
  if (!existsSync(payloadPath)) {
    throw new Error("Missing .tmp-hyp-replay-payload.json — run dump-hyp-replay-payload.ts first");
  }
  const raw = JSON.parse(readFileSync(payloadPath, "utf8")) as Record<string, string>;
  if (!raw.Id || !raw.Sign || !raw.Order || !raw.Amount || !raw.CCode) {
    throw new Error("Payload incomplete — refuse to replay");
  }

  const qs = new URLSearchParams();
  // Preserve key order from stored object insertion order (JSON parse order).
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    if (/^(KEY|PassP|Passp)$/i.test(k)) continue;
    qs.append(k, String(v));
  }

  const url = `https://hagourbywael.com/api/payments/hyp/return?${qs.toString()}`;
  console.log(
    JSON.stringify(
      {
        replaying: true,
        order: raw.Order,
        amount: raw.Amount,
        cCode: raw.CCode,
        hasId: true,
        hasSign: true,
        fild1: raw.Fild1 || null,
      },
      null,
      2,
    ),
  );

  const res = await fetch(url, { method: "GET", redirect: "manual" });
  console.log(
    JSON.stringify(
      {
        status: res.status,
        location: res.headers.get("location"),
        successPage: /\/payment\/success/i.test(res.headers.get("location") || ""),
        failedPage: /\/payment\/failed/i.test(res.headers.get("location") || ""),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
