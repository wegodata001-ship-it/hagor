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

function has(k: string) {
  return Boolean(process.env[k]?.trim());
}

const keys = [
  "HYP_API_KEY",
  "HYP_PASSP",
  "HYP_USER",
  "HYP_PASSWORD",
  "HYP_TERMINAL_NUMBER",
  "HYP_MID",
  "HYP_RELAY_URL",
  "HYP_MASOF",
  "HYP_WEBHOOK_SECRET",
  "PAYMENT_PROVIDER",
  "ALLOW_DEMO_PAYMENT",
  "NEXT_PUBLIC_ALLOW_DEMO_PAYMENT",
  "NEXT_PUBLIC_HYP_API_KEY",
  "NEXT_PUBLIC_HYP_PASSP",
  "NEXT_PUBLIC_SITE_URL",
];

for (const k of keys) {
  console.log(`${k}: ${has(k) ? "EXISTS" : "MISSING"}`);
}
