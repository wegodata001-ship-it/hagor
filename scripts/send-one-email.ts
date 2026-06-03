/**
 * Send a simple test email (CLI). Usage: npx tsx scripts/send-one-email.ts user@example.com
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import nodemailer from "nodemailer";

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

loadEnvFile(".env");
loadEnvFile(".env.local");

const to = process.argv[2]?.trim();
if (!to) {
  console.error("Usage: npx tsx scripts/send-one-email.ts <email>");
  process.exit(1);
}

const host = process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com";
const port = Number(process.env.SMTP_PORT?.trim() || "587");
const user = process.env.SMTP_USER?.trim() || "";
const pass = process.env.SMTP_PASS?.trim() || "";
const fromName = process.env.EMAIL_FROM_NAME?.trim() || "HAGOUR BY WAEL";
const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || "";

if (!user || !pass || !fromAddress) {
  console.error("SMTP not configured (SMTP_USER, SMTP_PASS, EMAIL_FROM_ADDRESS)");
  process.exit(1);
}

async function main() {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject: "HAGOUR BY WAEL — הודעה",
    html: `<p dir="rtl">שלום,</p><p dir="rtl">זו הודעה פשוטה מ־<strong>HAGOUR BY WAEL</strong>.</p>`,
    text: "שלום — זו הודעה פשוטה מ-HAGOUR BY WAEL.",
  });

  console.log("Sent:", info.messageId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
