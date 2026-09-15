import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export type PaymentAttemptStatus =
  | "INITIATED"
  | "VERIFIED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN";

/** INITIATED older than this (no return/VERIFY) → UNKNOWN / REQUIRES_RECONCILIATION — not FAILED. */
export const PAYMENT_ATTEMPT_STALE_MS = 45 * 60 * 1000;

const TERMINAL: ReadonlySet<PaymentAttemptStatus> = new Set(["PAID", "FAILED", "CANCELLED"]);

type AttemptDelegate = {
  create: (args: unknown) => Promise<{ id: string }>;
  findFirst: (args: unknown) => Promise<{ id: string; status: string } | null>;
  update: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
};

function attemptDb(): AttemptDelegate | null {
  const d = (prisma as { paymentAttempt?: AttemptDelegate }).paymentAttempt;
  return d ?? null;
}

function canTransition(from: string, to: PaymentAttemptStatus): boolean {
  if (from === to) return true;
  if (from === "PAID") return to === "PAID";
  if (TERMINAL.has(from as PaymentAttemptStatus) && to === "PAID") return false;
  if (from === "INITIATED") {
    return to === "VERIFIED" || to === "FAILED" || to === "CANCELLED" || to === "UNKNOWN";
  }
  if (from === "VERIFIED") {
    return to === "PAID" || to === "FAILED" || to === "UNKNOWN";
  }
  if (from === "UNKNOWN") {
    return to === "PAID" || to === "FAILED" || to === "VERIFIED" || to === "UNKNOWN";
  }
  if (from === "FAILED" || from === "CANCELLED") {
    return false;
  }
  return false;
}

function timestampFor(status: PaymentAttemptStatus): Record<string, Date> {
  const now = new Date();
  if (status === "VERIFIED") return { verifiedAt: now };
  if (status === "PAID") return { paidAt: now, verifiedAt: now };
  if (status === "FAILED") return { failedAt: now };
  return {};
}

export async function createPaymentAttempt(input: {
  orderId: string;
  provider: string;
  amount: number;
  currency: string;
  successUrl?: string;
  errorUrl?: string;
  cancelUrl?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ id: string } | null> {
  try {
    const db = attemptDb();
    if (!db) return null;
    return await db.create({
      data: {
        storeId: STORE_ID,
        orderId: input.orderId,
        provider: input.provider,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        status: "INITIATED",
        successUrl: input.successUrl,
        errorUrl: input.errorUrl,
        cancelUrl: input.cancelUrl,
        metadata: input.metadata,
      },
      select: { id: true },
    });
  } catch (e) {
    console.error("[payments] payment_attempt_create_failed", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function markPaymentAttempt(
  orderId: string,
  status: PaymentAttemptStatus,
  opts?: {
    transactionId?: string | null;
    confirmationNumber?: string | null;
    providerReference?: string | null;
    lastError?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  try {
    const db = attemptDb();
    if (!db) return;
    const latest = await db.findFirst({
      where: { storeId: STORE_ID, orderId, provider: "HYP" },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    if (!latest) return;
    if (!canTransition(latest.status, status)) {
      console.info("[payments] payment_attempt_transition_blocked", {
        orderId,
        from: latest.status,
        to: status,
      });
      return;
    }

    await db.update({
      where: { id: latest.id },
      data: {
        status,
        ...timestampFor(status),
        ...(opts?.transactionId != null
          ? { transactionId: opts.transactionId, providerReference: opts.transactionId }
          : {}),
        ...(opts?.providerReference != null ? { providerReference: opts.providerReference } : {}),
        ...(opts?.confirmationNumber != null
          ? { confirmationNumber: opts.confirmationNumber }
          : {}),
        ...(opts?.lastError !== undefined ? { lastError: opts.lastError } : {}),
        ...(opts?.metadata !== undefined ? { metadata: opts.metadata } : {}),
      },
    });
  } catch (e) {
    console.error("[payments] payment_attempt_update_failed", e instanceof Error ? e.message : e);
  }
}

/**
 * Stale INITIATED (customer may have closed browser) → UNKNOWN / REQUIRES_RECONCILIATION.
 * Never FAILED. Never PAID.
 */
export async function markStaleInitiatedAttempts(opts?: {
  olderThanMs?: number;
  orderId?: string;
}): Promise<number> {
  try {
    const db = attemptDb();
    if (!db) return 0;
    const olderThanMs = opts?.olderThanMs ?? PAYMENT_ATTEMPT_STALE_MS;
    const cutoff = new Date(Date.now() - olderThanMs);
    const result = await db.updateMany({
      where: {
        storeId: STORE_ID,
        provider: "HYP",
        status: "INITIATED",
        createdAt: { lt: cutoff },
        ...(opts?.orderId ? { orderId: opts.orderId } : {}),
      },
      data: {
        status: "UNKNOWN",
        lastError: "STALE_INITIATED_REQUIRES_RECONCILIATION",
        metadata: {
          reason: "REQUIRES_RECONCILIATION",
          note: "No browser return / VERIFY within timeout. Not FAILED. Not PAID.",
        },
      },
    });
    return result.count;
  } catch (e) {
    console.error("[payments] stale_attempt_mark_failed", e instanceof Error ? e.message : e);
    return 0;
  }
}

export function attemptNeedsReconciliation(status: string | null | undefined): boolean {
  return status === "UNKNOWN";
}
