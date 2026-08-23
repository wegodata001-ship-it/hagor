/**
 * Send audit test email via the same email-service used in production.
 * Usage: npx tsx scripts/send-email-system-test.ts [optional-to]
 * Default recipient: CONTACT_RECEIVER_EMAIL
 */
import Module from "node:module";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Allow importing Next "server-only" modules from a CLI script.
type NodeModuleLoad = (request: string, parent: unknown, isMain: boolean) => unknown;
const moduleWithLoad = Module as unknown as { _load: NodeModuleLoad };
const originalLoad = moduleWithLoad._load.bind(Module) as NodeModuleLoad;
moduleWithLoad._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const root = join(__dirname, "..");

function loadEnvFile(file: string) {
  const path = join(root, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

// Base then local override (same order as Next.js).
loadEnvFile(".env");
loadEnvFile(".env.local");

async function main() {
  const { sendMail } = await import("../src/lib/email/send");
  const { getEmailConfig, isEmailConfigured } = await import("../src/lib/email/config");
  const { wrapEmailHtml } = await import("../src/lib/email/layout");

  if (!isEmailConfigured()) {
    console.error("FAIL: SMTP not configured (SMTP_USER / SMTP_PASS / EMAIL_FROM_ADDRESS)");
    process.exit(1);
  }

  const cfg = getEmailConfig();
  const to = process.argv[2]?.trim() || cfg.contactReceiver || "";
  if (!to) {
    console.error("FAIL: no recipient (pass email arg or set CONTACT_RECEIVER_EMAIL)");
    process.exit(1);
  }

  console.log("Provider host:", cfg.host);
  console.log("Port:", cfg.port);
  console.log("From configured:", Boolean(cfg.fromAddress));
  console.log("Recipient configured:", Boolean(to));

  const body = `
    <p>בדיקת מערכת המיילים של HAGOUR.</p>
    <p>אם הודעה זו התקבלה, חיבור Brevo פעיל ותקין.</p>
  `;

  const ok = await sendMail({
    to,
    subject: "HAGOUR - Email System Test",
    html: wrapEmailHtml("בדיקת מערכת מיילים", body),
    type: "test",
  });

  if (!ok) {
    console.error("FAIL: sendMail returned false (see logs above)");
    process.exit(1);
  }
  console.log("PASS: test email sent via existing sendMail service");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
