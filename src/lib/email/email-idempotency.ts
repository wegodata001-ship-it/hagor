import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

const CUSTOMER_CONFIRMATION = "CUSTOMER_ORDER_CONFIRMATION_SENT";
const OWNER_PAID = "OWNER_ORDER_PAID_SENT";
const EMAIL_FAILED = "EMAIL_FAILED";

async function hasLog(orderId: string, action: string): Promise<boolean> {
  const row = await prisma.adminActionLog.findFirst({
    where: { storeId: STORE_ID, entity: "Order", entityId: orderId, action },
    select: { id: true },
  });
  return Boolean(row);
}

async function writeLog(orderId: string, action: string, metadata?: Prisma.InputJsonValue): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      storeId: STORE_ID,
      userId: "system",
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

export async function markCustomerConfirmationEmailSent(orderId: string): Promise<void> {
  if (await hasLog(orderId, CUSTOMER_CONFIRMATION)) return;
  await writeLog(orderId, CUSTOMER_CONFIRMATION);
}

export async function markOwnerPaidEmailSent(orderId: string): Promise<void> {
  if (await hasLog(orderId, OWNER_PAID)) return;
  await writeLog(orderId, OWNER_PAID);
}

/** Record EMAIL_FAILED without changing payment status. */
export async function markOrderEmailFailed(orderId: string, detail: string): Promise<void> {
  await writeLog(orderId, EMAIL_FAILED, { detail: detail.slice(0, 500) });
}
