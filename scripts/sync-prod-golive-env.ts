/**
 * Sync required Production/Preview env vars from local .env/.env.local without printing secrets.
 * Usage: npx tsx scripts/sync-prod-golive-env.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(__dirname, "..");

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

function setEnv(name: string, value: string, environment: "production" | "preview") {
  const isPublic = name.startsWith("NEXT_PUBLIC_");
  const args = [
    "vercel",
    "env",
    "add",
    name,
    environment,
    "--value",
    value,
    "--force",
    "--yes",
    isPublic ? "--no-sensitive" : "--sensitive",
  ];
  const result = spawnSync("npx", args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    console.error(`FAIL set ${name} (${environment})`);
    console.error((result.stderr || result.stdout || "").slice(0, 400));
    process.exit(1);
  }
  console.log(`SET ${name} → ${environment} (EXISTS, value hidden)`);
}

const local = { ...scan(".env"), ...scan(".env.local") };

const required: Array<{ key: string; force?: string }> = [
  { key: "PAYMENT_PROVIDER", force: "hyp" },
  { key: "ALLOW_DEMO_PAYMENT", force: "false" },
  { key: "NEXT_PUBLIC_ALLOW_DEMO_PAYMENT", force: "false" },
  { key: "NEXT_PUBLIC_SITE_URL", force: "https://hagourbywael.com" },
  { key: "SMTP_HOST" },
  { key: "SMTP_USER" },
  { key: "SMTP_PASS" },
  { key: "EMAIL_FROM_ADDRESS" },
  { key: "CONTACT_RECEIVER_EMAIL" },
];

for (const item of required) {
  const value = item.force ?? local[item.key]?.trim();
  if (!value) {
    console.error(`MISSING local value for ${item.key} — cannot sync`);
    process.exit(2);
  }
  setEnv(item.key, value, "production");
  setEnv(item.key, value, "preview");
}

console.log("SYNC_DONE");
