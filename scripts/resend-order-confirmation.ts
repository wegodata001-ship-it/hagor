/**
 * Controlled resend of purchase confirmation for an already-PAID order.
 * Does NOT create Payment / inventory side effects.
 *
 *   npx tsx --env-file=.env.production.local scripts/resend-order-confirmation.ts HAGOR-1017
 */
import { PrismaClient } from "@prisma/client";
import { sendOrderConfirmationEmail } from "../src/lib/email/email-service";

const orderNumber = process.argv[2];
if (!orderNumber) {
  console.error("Usage: npx tsx --env-file=.env.production.local scripts/resend-order-confirmation.ts HAGOR-XXXX");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      paymentStatus: true,
      customerEmail: true,
      customerName: true,
      total: true,
    },
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
  if (!order.customerEmail?.trim()) {
    console.error("MISSING_EMAIL");
    process.exit(4);
  }

  const ok = await sendOrderConfirmationEmail(order.id);
  console.log(ok ? "EMAIL_SENT_OR_ALREADY_SENT" : "EMAIL_FAILED");
  process.exit(ok ? 0 : 5);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
