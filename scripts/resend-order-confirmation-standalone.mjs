/**
 * Standalone controlled resend — no Next.js server-only imports.
 * Does not create Payment / inventory side effects.
 *
 *   npx vercel env run -e production -- node scripts/resend-order-confirmation-standalone.mjs HAGOR-1017
 */
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const orderNumber = process.argv[2];
if (!orderNumber) {
  console.error("Usage: node scripts/resend-order-confirmation-standalone.mjs HAGOR-XXXX");
  process.exit(1);
}

const STORE_ID = process.env.NEXT_PUBLIC_STORE_ID || "hagor";
const BRAND = "HAGOUR BY WAEL";
const CUSTOMER_CONFIRMATION = "CUSTOMER_ORDER_CONFIRMATION_SENT";
const EMAIL_FAILED = "EMAIL_FAILED";

function money(n) {
  return `₪${Number(n).toFixed(2)}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const prisma = new PrismaClient();

async function main() {
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim();
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || BRAND;
  const host = process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "587");

  if (!smtpUser || !smtpPass || !fromAddress) {
    console.error("SMTP_NOT_CONFIGURED", {
      hasUser: Boolean(smtpUser),
      hasPass: Boolean(smtpPass),
      hasFrom: Boolean(fromAddress),
    });
    process.exit(10);
  }

  const order = await prisma.order.findFirst({
    where: { storeId: STORE_ID, orderNumber },
    include: { items: true },
  });
  if (!order) {
    console.error("ORDER_NOT_FOUND");
    process.exit(2);
  }

  console.log(
    JSON.stringify(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        total: String(order.total),
      },
      null,
      2,
    ),
  );

  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "TEST_PAID") {
    console.error("REFUSING_UNPAID");
    process.exit(3);
  }
  const to = (order.customerEmail || "").trim();
  if (!to) {
    console.error("MISSING_EMAIL");
    process.exit(4);
  }

  const already = await prisma.adminActionLog.findFirst({
    where: {
      storeId: STORE_ID,
      entity: "Order",
      entityId: order.id,
      action: CUSTOMER_CONFIRMATION,
    },
    select: { id: true },
  });
  if (already) {
    console.log("ALREADY_SENT_SKIP");
    process.exit(0);
  }

  const itemRows = order.items
    .map(
      (i) => `<tr>
      <td style="padding:12px 8px;border-bottom:1px solid #27272a;color:#f8fafc;"><strong>${escapeHtml(i.productName)}</strong></td>
      <td style="padding:12px 8px;border-bottom:1px solid #27272a;text-align:center;">×${i.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #27272a;text-align:left;color:#c89211;font-weight:700;">${money(i.totalPrice)}</td>
    </tr>`,
    )
    .join("");

  const discount = Number(order.discountAmount) + Number(order.pointsDiscountAmount);
  const discountRow =
    discount > 0
      ? `<tr><td style="padding:6px 0;color:#94a3b8;">הנחה</td><td style="padding:6px 0;text-align:left;color:#86efac;">−${money(discount)}</td></tr>`
      : "";

  const body = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.18em;color:#c89211;font-weight:800;">${BRAND}</p>
    <p style="margin:0 0 18px;font-size:20px;font-weight:800;color:#fff;">תודה על ההזמנה</p>
    <p style="margin:0 0 16px;">שלום ${escapeHtml(order.customerName)},</p>
    <p style="margin:0 0 18px;">התשלום התקבל בהצלחה וההזמנה שלך נקלטה במערכת.</p>
    <p><strong>מספר הזמנה:</strong> ${escapeHtml(order.orderNumber)}</p>
    <p><strong>סכום ששולם:</strong> ${money(order.total)}</p>
    <p style="margin:20px 0 8px;font-size:14px;font-weight:800;color:#c89211;">פרטי ההזמנה</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #27272a;border-radius:12px;margin:16px 0;">
      <tbody>${itemRows}</tbody>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:6px 0;color:#94a3b8;">Subtotal</td><td style="padding:6px 0;text-align:left;">${money(order.subtotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#94a3b8;">משלוח</td><td style="padding:6px 0;text-align:left;">${money(order.deliveryPrice)}</td></tr>
      ${discountRow}
      <tr><td style="padding:12px 0 0;border-top:1px solid #27272a;font-weight:800;">סה״כ ששולם</td><td style="padding:12px 0 0;border-top:1px solid #27272a;text-align:left;color:#c89211;font-weight:800;">${money(order.total)}</td></tr>
    </table>
    ${order.deliveryOptionName ? `<p style="margin-top:16px;"><strong>שיטת משלוח:</strong> ${escapeHtml(order.deliveryOptionName)}</p>` : ""}
    ${order.address ? `<p><strong>כתובת:</strong> ${escapeHtml(order.address)}</p>` : ""}
    <p style="margin:20px 0 0;">נעדכן אותך בהמשך לגבי סטטוס ההזמנה.</p>
    <p style="margin:24px 0 0;text-align:center;font-size:12px;letter-spacing:0.16em;color:#c89211;font-weight:800;">${BRAND}</p>
  `;

  const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"/></head>
  <body style="margin:0;padding:0;background:#0b0b0b;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b0b;padding:32px 16px;"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111;border-radius:16px;border:1px solid #27272a;">
  <tr><td style="padding:24px 28px;border-bottom:2px solid #c89211;">
  <div style="font-size:11px;letter-spacing:0.2em;color:#c89211;font-weight:800;">${BRAND}</div>
  <div style="margin-top:8px;font-size:22px;font-weight:800;color:#fff;">תודה על ההזמנה</div>
  </td></tr>
  <tr><td style="padding:28px;font-size:15px;line-height:1.65;color:#d4d4d8;">${body}</td></tr>
  </table></td></tr></table></body></html>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject: `הזמנה ${order.orderNumber} התקבלה בהצלחה | ${BRAND}`,
      html,
    });
    await prisma.adminActionLog.create({
      data: {
        storeId: STORE_ID,
        userId: "system",
        action: CUSTOMER_CONFIRMATION,
        entity: "Order",
        entityId: order.id,
        metadata: { source: "controlled_resend" },
      },
    });
    console.log("EMAIL_SENT");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("EMAIL_FAILED", message.slice(0, 400));
    await prisma.adminActionLog.create({
      data: {
        storeId: STORE_ID,
        userId: "system",
        action: EMAIL_FAILED,
        entity: "Order",
        entityId: order.id,
        metadata: { detail: `controlled_resend:${message.slice(0, 200)}` },
      },
    });
    process.exit(5);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
