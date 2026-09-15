import {
  LoyaltyTransactionType,
  OrderPaymentStatus,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "../prisma";
import { STORE_ID } from "@/lib/store";
import { reduceInventoryAfterPayment } from "@/lib/inventory/updateInventory";
import { sendDemoOrderConfirmationEmail } from "@/lib/email/email-service";
import { markOrderEmailFailed } from "@/lib/email/email-idempotency";
import {
  notifyOrderConfirmationToCustomer,
  notifyOrderPaidToOwner,
  type OrderNotificationPayload,
} from "@/lib/notifications";
import { sanitizePaymentPayload } from "@/lib/payments/sanitize-payload";

export type WebhookInput = {
  provider: string;
  orderId: string;
  amount: number;
  currency: string;
  /** Provider-specific payment success flag */
  success: boolean;
  transactionId?: string | null;
  confirmationNumber?: string | null;
  rawPayload?: unknown;
  /** Default PAID — test checkout uses TEST_PAID */
  orderPaymentStatus?: OrderPaymentStatus;
  paymentRecordStatus?: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

async function buildPaidEmailPayload(orderId: string): Promise<OrderNotificationPayload | null> {
  const paidSummary = await prisma.order.findFirst({
    where: { id: orderId, storeId: STORE_ID },
    select: {
      customerEmail: true,
      customerName: true,
      orderNumber: true,
      total: true,
    },
  });
  if (!paidSummary) return null;
  const cur = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: { currency: true },
  });
  return {
    orderId,
    orderNumber: paidSummary.orderNumber,
    customerEmail: paidSummary.customerEmail,
    customerName: paidSummary.customerName,
    total: Number(paidSummary.total),
    currency: cur?.currency ?? "ILS",
  };
}

/**
 * Send post-payment emails AFTER settlement is committed.
 * Failures are logged only — never reverses PAID / Payment rows.
 * Must be awaited on serverless so the runtime does not freeze mid-send.
 */
async function sendPostPaymentEmails(orderId: string, provider: string): Promise<void> {
  const payload = await buildPaidEmailPayload(orderId);
  if (!payload) return;
  try {
    if (provider === "DEMO") {
      await sendDemoOrderConfirmationEmail(orderId);
    } else {
      await notifyOrderConfirmationToCustomer(payload);
    }
    await notifyOrderPaidToOwner(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] EMAIL_FAILED post_payment", orderId, message.slice(0, 400));
    try {
      await markOrderEmailFailed(orderId, `post_payment:${message.slice(0, 200)}`);
    } catch {
      /* ignore secondary log failure */
    }
  }
}

export async function processPaymentWebhook(input: WebhookInput): Promise<{ ok: boolean; message: string }> {
  const storeId = STORE_ID;

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, storeId },
    include: {
      items: true,
      customerProfile: true,
    },
  });

  if (!order) return { ok: false, message: "Order not found" };

  if (input.transactionId) {
    const existing = await prisma.payment.findFirst({
      where: { storeId, transactionId: input.transactionId },
    });
    if (existing) {
      // Settlement already done — still ensure confirmation email if first attempt never finished (serverless freeze).
      if (input.success) {
        await sendPostPaymentEmails(order.id, input.provider);
      }
      return { ok: true, message: "Duplicate transaction ignored" };
    }
  }

  const expectedTotal = roundMoney(Number(order.total));
  const paidAmount = roundMoney(input.amount);
  if (paidAmount !== expectedTotal) {
    return { ok: false, message: "Amount mismatch" };
  }

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  const currency = settings?.currency ?? "ILS";
  if (input.currency !== currency) {
    return { ok: false, message: "Currency mismatch" };
  }

  const settled =
    order.status === OrderStatus.PAID &&
    (order.paymentStatus === OrderPaymentStatus.PAID ||
      order.paymentStatus === OrderPaymentStatus.TEST_PAID ||
      order.paymentStatus === OrderPaymentStatus.DEMO_PAID);
  if (settled) {
    if (input.success) {
      await sendPostPaymentEmails(order.id, input.provider);
    }
    return { ok: true, message: "Order already paid" };
  }

  if (!input.success) {
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { id: order.id, storeId },
        data: {
          paymentStatus: OrderPaymentStatus.FAILED,
          status: OrderStatus.FAILED,
        },
      });
    });
    await prisma.payment.create({
      data: {
        storeId,
        orderId: order.id,
        provider: input.provider,
        amount: new Prisma.Decimal(paidAmount),
        currency,
        status: "FAILED",
        transactionId: input.transactionId ?? undefined,
        confirmationNumber: input.confirmationNumber ?? undefined,
        rawPayload: sanitizePaymentPayload(input.rawPayload),
      },
    });
    return { ok: true, message: "Payment failed recorded" };
  }

  const orderPaymentStatus = input.orderPaymentStatus ?? OrderPaymentStatus.PAID;
  const paymentRecordStatus = input.paymentRecordStatus ?? "PAID";

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { id: order.id, storeId },
      data: {
        paymentStatus: orderPaymentStatus,
        status: OrderStatus.PAID,
      },
    });

    if (order.couponCode) {
      await tx.coupon.updateMany({
        where: { storeId, code: order.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (order.customerId && order.loyaltyPointsRedeemed > 0) {
      await tx.customerProfile.updateMany({
        where: { id: order.customerId, storeId },
        data: { pointsBalance: { decrement: order.loyaltyPointsRedeemed } },
      });
      await tx.loyaltyTransaction.create({
        data: {
          storeId,
          customerId: order.customerId,
          orderId: order.id,
          type: LoyaltyTransactionType.REDEEM,
          points: order.loyaltyPointsRedeemed,
          reason: "Checkout redeem (paid)",
        },
      });
    }

    if (order.customerId) {
      const paidTotal = Number(order.total);
      await tx.customerProfile.updateMany({
        where: { id: order.customerId, storeId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent: { increment: order.total },
        },
      });
      const loyalty = await tx.loyaltySettings.findUnique({ where: { storeId } });
      if (loyalty?.enabled) {
        const minOk = Number(loyalty.minOrderForPoints);
        const rate = Number(loyalty.pointsPerShekel);
        if (paidTotal >= minOk) {
          const pointsToAdd = Math.floor(paidTotal * rate);
          if (pointsToAdd > 0) {
            await tx.customerProfile.updateMany({
              where: { id: order.customerId, storeId },
              data: { pointsBalance: { increment: pointsToAdd } },
            });
            await tx.loyaltyTransaction.create({
              data: {
                storeId,
                customerId: order.customerId,
                orderId: order.id,
                type: LoyaltyTransactionType.EARN,
                points: pointsToAdd,
                reason: "Order paid",
              },
            });
          }
        }
      }
    }

    await tx.payment.create({
      data: {
        storeId,
        orderId: order.id,
        provider: input.provider,
        amount: new Prisma.Decimal(paidAmount),
        currency,
        status: paymentRecordStatus,
        transactionId: input.transactionId ?? undefined,
        confirmationNumber: input.confirmationNumber ?? undefined,
        rawPayload: sanitizePaymentPayload(input.rawPayload),
      },
    });
  });

  // Reduce inventory ONLY after verified paid status is persisted.
  // Centralized logic: supports variants + prevents double-decrement.
  const inv = await reduceInventoryAfterPayment(order.id);
  if (!inv.ok) {
    // Payment stays PAID — inventory error is stored on the order. Emails still go out.
    console.error("[payments] inventory_error_after_paid", order.id, inv.message);
  }

  await sendPostPaymentEmails(order.id, input.provider);

  return inv.ok
    ? { ok: true, message: "Payment recorded" }
    : { ok: true, message: `Payment recorded; inventory error: ${inv.message}` };
}
