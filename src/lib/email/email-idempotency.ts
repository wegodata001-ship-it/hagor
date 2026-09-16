import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

const CUSTOMER_CONFIRMATION = "CUSTOMER_ORDER_CONFIRMATION_SENT";
const OWNER_PAID = "OWNER_ORDER_PAID_SENT";
const EMAIL_FAILED = "EMAIL_FAILED";

/**
 * Metadata we persist alongside a successful send. Everything here is safe
 * for admin display — no secrets. The `messageId` comes from the provider
 * (SMTP/Resend); it is NOT the internal DB id.
 */
export type CustomerConfirmationEmailMeta = {
  recipient?: string;
  filename?: string;
  provider?: string;
  messageId?: string;
  /** Whether this send was triggered manually from the admin UI. */
  manual?: boolean;
};

async function hasLog(orderId: string, action: string): Promise<boolean> {
  const row = await prisma.adminActionLog.findFirst({
    where: { storeId: STORE_ID, entity: "Order", entityId: orderId, action },
    select: { id: true },
  });
  return Boolean(row);
}

async function writeLog(
  orderId: string,
  action: string,
  metadata?: Prisma.InputJsonValue,
  userId: string = "system",
): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      storeId: STORE_ID,
      userId,
      action,
      entity: "Order",
      entityId: orderId,
      metadata: metadata ?? undefined,
    },
  });
}

export async function wasCustomerConfirmationEmailSent(orderId: string): Promise<boolean> {
  return hasLog(orderId, CUSTOMER_CONFIRMATION);
}

export async function wasOwnerPaidEmailSent(orderId: string): Promise<boolean> {
  return hasLog(orderId, OWNER_PAID);
}

/**
 * Record a successful customer confirmation send.
 *
 * - The FIRST successful send writes a `CUSTOMER_ORDER_CONFIRMATION_SENT`
 *   row. Repeated automatic calls short-circuit here (idempotency).
 * - Manual resends (admin UI) always append a new row so the send history
 *   is preserved and the "last sent at" reflects reality. `metadata.manual`
 *   is set to `true` in that case; `userId` is the admin who triggered it.
 */
export async function markCustomerConfirmationEmailSent(
  orderId: string,
  meta: CustomerConfirmationEmailMeta = {},
  userId: string = "system",
): Promise<void> {
  // Filter out undefined so we never persist an empty key.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) if (v !== undefined) cleaned[k] = v;
  cleaned.sentAt = new Date().toISOString();

  if (meta.manual) {
    await writeLog(orderId, CUSTOMER_CONFIRMATION, cleaned as Prisma.InputJsonValue, userId);
    return;
  }
  if (await hasLog(orderId, CUSTOMER_CONFIRMATION)) return;
  await writeLog(orderId, CUSTOMER_CONFIRMATION, cleaned as Prisma.InputJsonValue, userId);
}

export async function markOwnerPaidEmailSent(orderId: string): Promise<void> {
  if (await hasLog(orderId, OWNER_PAID)) return;
  await writeLog(orderId, OWNER_PAID);
}

/** Record EMAIL_FAILED without changing payment status. */
export async function markOrderEmailFailed(orderId: string, detail: string): Promise<void> {
  await writeLog(orderId, EMAIL_FAILED, { detail: detail.slice(0, 500), failedAt: new Date().toISOString() });
}

/**
 * Read the most recent send state for the "customer order confirmation"
 * for admin UI display. Returns `{ sent: false }` when there is no history.
 *
 * The reader considers both success and failure events. `lastSentAt` is
 * the most-recent successful send; `lastError` is the most-recent failure
 * (with its own timestamp).
 */
export type CustomerConfirmationEmailStatus = {
  sent: boolean;
  lastSentAt?: string;
  recipient?: string;
  filename?: string;
  provider?: string;
  messageId?: string;
  manual?: boolean;
  lastError?: string;
  lastErrorAt?: string;
};

export async function getCustomerConfirmationEmailStatus(
  orderId: string,
): Promise<CustomerConfirmationEmailStatus> {
  const rows = await prisma.adminActionLog.findMany({
    where: {
      storeId: STORE_ID,
      entity: "Order",
      entityId: orderId,
      action: { in: [CUSTOMER_CONFIRMATION, EMAIL_FAILED] },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { action: true, metadata: true, createdAt: true },
  });

  const status: CustomerConfirmationEmailStatus = { sent: false };

  for (const row of rows) {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};

    if (row.action === CUSTOMER_CONFIRMATION && !status.lastSentAt) {
      status.sent = true;
      status.lastSentAt = row.createdAt.toISOString();
      const r = meta.recipient;
      const f = meta.filename;
      const p = meta.provider;
      const m = meta.messageId;
      const manual = meta.manual;
      if (typeof r === "string") status.recipient = r;
      if (typeof f === "string") status.filename = f;
      if (typeof p === "string") status.provider = p;
      if (typeof m === "string") status.messageId = m;
      if (typeof manual === "boolean") status.manual = manual;
    } else if (
      row.action === EMAIL_FAILED &&
      !status.lastError &&
      typeof meta.detail === "string" &&
      // Only surface failures relevant to the customer-confirmation flow.
      /customer_confirmation|post_payment/i.test(meta.detail)
    ) {
      status.lastError = meta.detail;
      status.lastErrorAt = row.createdAt.toISOString();
    }
  }

  return status;
}
