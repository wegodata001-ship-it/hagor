/**
 * Brevo SMTP smoke test — no secret values printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";

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
  const host = process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from = process.env.EMAIL_FROM_ADDRESS?.trim() || "";
  const to =
    process.env.CONTACT_RECEIVER_EMAIL?.trim() ||
    process.env.STORE_OWNER_EMAIL?.trim() ||
    "";

  console.log(
    JSON.stringify(
      {
        SMTP_HOST: host ? "EXISTS" : "MISSING",
        SMTP_USER: user ? "EXISTS" : "MISSING",
        SMTP_PASS: pass ? "EXISTS" : "MISSING",
        EMAIL_FROM_ADDRESS: from ? "EXISTS" : "MISSING",
        to: to ? "EXISTS" : "MISSING",
      },
      null,
      2,
    ),
  );

  if (!user || !pass || !from || !to) {
    console.log(JSON.stringify({ ok: false, error: "SMTP_OR_RECEIVER_MISSING" }));
    process.exit(2);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `"HAGOUR" <${from}>`,
      to,
      subject: "HAGOUR — מייל בדיקה",
      html: "<p>זהו מייל בדיקה לפני רכישה חיה. אם קיבלת — Brevo SMTP פעיל.</p>",
    });
    console.log(JSON.stringify({ ok: true, status: "accepted" }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const safe = /auth|login|credentials|535|530/i.test(msg) ? "SMTP_AUTH_ERROR" : "SMTP_SEND_ERROR";
    console.log(JSON.stringify({ ok: false, error: safe }));
    process.exit(1);
  }
}

main();
