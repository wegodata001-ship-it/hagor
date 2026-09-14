/**
 * Hyp return ownership + VERIFY orchestration (no server-only — unit-testable).
 * Fild1/Fild2/Fild3 are NEVER trusted for store/order ownership.
 */

export type HypOwnedOrder = {
  id: string;
  storeId: string;
  orderNumber: string;
  total: number;
};

export type HypCallbackFields = {
  orderId: string;
  storeId: string;
  amount: number;
  currency: string;
  success: boolean;
  transactionId?: string;
  confirmationNumber?: string;
  rawPayload: Record<string, string>;
};

export type HypResolveDeps = {
  storeId: string;
  configured: boolean;
  missingEnv?: string[];
  lookupOrder: (orderRef: string) => Promise<HypOwnedOrder | null>;
  verifyReturn: (
    params: Record<string, string>,
    orderedPairs?: Array<[string, string]>,
  ) => Promise<boolean>;
  orderedPairs?: Array<[string, string]>;
};

function pick(params: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (params[k] != null && String(params[k]).trim() !== "") return String(params[k]).trim();
  }
  return "";
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Correlation key from Hyp redirect — Order only (never Fild*). */
export function pickHypOrderReference(params: Record<string, string>): string {
  return pick(params, "Order", "orderId", "order");
}

/** @deprecated Untrusted on return — Hyp may overwrite Fild2 with customer email. */
export function pickHypOrderNumberHint(params: Record<string, string>): string {
  return pick(params, "Fild2");
}

export function hasExplicitStoreIdMismatch(
  params: Record<string, string>,
  storeId: string,
): boolean {
  const queryStoreId = pick(params, "storeId");
  return Boolean(queryStoreId && queryStoreId !== storeId);
}

export async function resolveHypPaymentCore(
  params: Record<string, string>,
  deps: HypResolveDeps,
): Promise<HypCallbackFields> {
  if (!deps.configured) {
    throw new Error(`MISSING_ENV:${(deps.missingEnv || []).join(",")}`);
  }

  if (hasExplicitStoreIdMismatch(params, deps.storeId)) {
    throw new Error("STORE_MISMATCH");
  }

  const orderRef = pickHypOrderReference(params);
  if (!orderRef) throw new Error("Missing order reference");

  const order = await deps.lookupOrder(orderRef);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.storeId !== deps.storeId) throw new Error("STORE_MISMATCH");

  const cCode = pick(params, "CCode");
  const amountRaw = pick(params, "Amount");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) throw new Error("PAYMENT_AMOUNT_MISSING");

  const paidAmount = roundMoney(amount);
  const expectedAmount = roundMoney(order.total);
  if (paidAmount !== expectedAmount) {
    throw new Error("AMOUNT_MISMATCH");
  }

  const verified = await deps.verifyReturn(params, deps.orderedPairs);
  if (!verified) throw new Error("HYP_VERIFY_FAILED");

  const returnedOrder = pick(params, "Order", "orderId", "order");
  if (
    returnedOrder &&
    returnedOrder !== order.id &&
    returnedOrder !== order.orderNumber
  ) {
    throw new Error("ORDER_MISMATCH");
  }

  return {
    orderId: order.id,
    storeId: order.storeId,
    amount: paidAmount,
    currency: "ILS",
    success: cCode === "0",
    transactionId: pick(params, "Id", "id", "TransId") || undefined,
    confirmationNumber: pick(params, "ACode", "aCode") || undefined,
    rawPayload: params,
  };
}
