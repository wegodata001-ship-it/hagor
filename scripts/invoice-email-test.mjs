// Real send test for the invoice-email pipeline. Reads .env / .env.local
// (never overrides existing env), then attempts a live email through
// whichever provider the app would pick.
//
// Usage:
//   node scripts/invoice-email-test.mjs [recipient@example.com]
// Defaults to `Abed_cpa@012.net.il` if no argument is given, matching §4.

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
function loadEnvFile(file) {
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

const to = process.argv[2]?.trim() || "Abed_cpa@012.net.il";
const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || "";
const fromName = process.env.EMAIL_FROM_NAME?.trim() || "HAGOUR BY WAEL";

function pickProvider() {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim() &&
    process.env.EMAIL_FROM_ADDRESS?.trim()
  )
    return "smtp";
  return "none";
}

const provider = pickProvider();

console.log(
  JSON.stringify(
    {
      recipient: to,
      provider,
      envPresent: {
        SMTP_HOST: !!process.env.SMTP_HOST?.trim(),
        SMTP_USER: !!process.env.SMTP_USER?.trim(),
        SMTP_PASS: !!process.env.SMTP_PASS?.trim(),
        EMAIL_FROM_ADDRESS: !!fromAddress,
        EMAIL_FROM_NAME: !!fromName,
        RESEND_API_KEY: !!process.env.RESEND_API_KEY?.trim(),
      },
      fromAddress: fromAddress || null,
      fromName,
    },
    null,
    2,
  ),
);

if (provider === "none") {
  console.error("\n❌ Email service is NOT configured. Missing envs.");
  console.error("   To fix in production (Vercel):");
  console.error("     Option A (SMTP): set SMTP_USER, SMTP_PASS, EMAIL_FROM_ADDRESS.");
  console.error("     Option B (Resend, easier): set RESEND_API_KEY and EMAIL_FROM_ADDRESS.");
  console.error("   Then verify sender domain and redeploy.");
  process.exit(2);
}

const subject = `HAGOUR BY WAEL — invoice pipeline test (${new Date().toISOString()})`;
const html = `
  <p>שלום,</p>
  <p>מייל בדיקה משרת ההזמנות של <strong>HAGOUR BY WAEL</strong>.</p>
  <p>אם קיבלת את המייל הזה — הצינור פעיל וניתן לשלוח חשבוניות.</p>
`;

async function sendResend() {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress ? `${fromName} <${fromAddress}>` : "onboarding@resend.dev",
      to: [to],
      subject,
      html,
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: bodyText.slice(0, 400) };
  }
  return { ok: true, status: res.status, body: bodyText };
}

async function sendSmtp() {
  const host = process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
  });
  return {
    ok: (info.rejected || []).length === 0,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

try {
  console.log(`\n→ Attempting send via ${provider} …`);
  const result = provider === "resend" ? await sendResend() : await sendSmtp();
  console.log("\n=== PROVIDER RESPONSE ===");
  console.log(JSON.stringify(result, null, 2));
  console.log(result.ok ? "\n✅ Provider ACCEPTED the message." : "\n❌ Provider REJECTED the message.");
  console.log("Note: 'accepted' ≠ 'delivered'. Check the recipient's inbox.");
} catch (err) {
  console.error("\n❌ SEND FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
}
