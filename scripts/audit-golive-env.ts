/**
 * Presence-only env audit. Never prints secret/sensitive values.
 */
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const SECRET_RE = /KEY|PASSP|PASS|SECRET|PASSWORD|TOKEN|MASOF|DATABASE_URL|DIRECT_URL|USER|EMAIL|URL/i;

function scan(file: string): Record<string, string> {
  const path = join(root, file);
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
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
    out[key] = val;
  }
  return out;
}

function report(label: string, env: Record<string, string>, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = env[k];
    if (v == null || v === "" || v === "[SENSITIVE]") out[k] = v === "[SENSITIVE]" ? "EXISTS(hidden)" : "MISSING";
    else if (SECRET_RE.test(k)) out[k] = "EXISTS";
    else out[k] = v;
  }
  console.log(label);
  console.log(JSON.stringify(out, null, 2));
}

const keys = [
  "HYP_API_KEY",
  "HYP_PASSP",
  "HYP_MASOF",
  "PAYMENT_PROVIDER",
  "ALLOW_DEMO_PAYMENT",
  "NEXT_PUBLIC_ALLOW_DEMO_PAYMENT",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM_ADDRESS",
  "CONTACT_RECEIVER_EMAIL",
  "STORE_OWNER_EMAIL",
];

report("LOCAL", { ...scan(".env"), ...scan(".env.local") }, keys);
if (existsSync(join(root, ".env.vercel.check"))) {
  report("VERCEL_PRODUCTION_PULL", scan(".env.vercel.check"), keys);
  try {
    unlinkSync(join(root, ".env.vercel.check"));
  } catch {
    /* ignore */
  }
}
