/**
 * PaymentAttempt helper — NOT wired into production payment path.
 * Prisma model PaymentAttempt is not installed; all helpers are no-ops.
 * Kept for a future optional migration only.
 */
import "server-only";

import type { Prisma } from "@prisma/client";

export type PaymentAttemptStatus =
  | "INITIATED"
  | "VERIFIED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN";

/** INITIATED older than this → UNKNOWN / REQUIRES_RECONCILIATION — not FAILED. */
export const PAYMENT_ATTEMPT_STALE_MS = 45 * 60 * 1000;

export async function createPaymentAttempt(_input: {
  orderId: string;
  provider: string;
  amount: number;
  currency: string;
  successUrl?: string;
  errorUrl?: string;
  cancelUrl?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ id: string } | null> {
  return null;
}

export async function markPaymentAttempt(
  _orderId: string,
  _status: PaymentAttemptStatus,
  _opts?: {
    transactionId?: string | null;
    confirmationNumber?: string | null;
    providerReference?: string | null;
    lastError?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  return;
}

export async function markStaleInitiatedAttempts(_opts?: {
  olderThanMs?: number;
  orderId?: string;
}): Promise<number> {
  return 0;
}

export function attemptNeedsReconciliation(status: string | null | undefined): boolean {
  return status === "UNKNOWN";
}
