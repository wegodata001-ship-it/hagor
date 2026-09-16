import "server-only";

import type { OrderPaymentStatus, PaymentWebhookLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Payment activity classifier — READ-ONLY.
 *
 * This module converts raw `PaymentWebhookLog` rows into human-friendly
 * "events" for the admin UI. It never modifies data and never re-computes
 * payment/financial logic. The raw status + errorMessage stay accessible
 * under `technical` for support debugging.
 *
 * Design principle:
 *   A `PaymentWebhookLogStatus.ERROR` row does NOT necessarily mean a
 *   customer's payment failed. Most ERROR rows in practice are:
 *     - Callbacks with no order reference (test probes / stale links)
 *     - Signature verification failures (test callbacks)
 *     - Malformed request bodies (bots)
 *   Only when the acquirer explicitly declines a real transaction should
 *   we tell the store owner "payment not approved". We surface such rows
 *   under `failed_payment` and everything else that is technical noise
 *   under `unattributable` / `technical`.
 */

/** UI-facing classification. Ordered from most to least business-relevant. */
export type EventKind =
  | "success" // Payment approved and recorded.
  | "duplicate" // Second callback for a paid order; no double charge.
  | "failed_payment" // Acquirer declined an actual transaction attempt.
  | "needs_review" // Callback for a real order that is not paid — investigate.
  | "pending" // RECEIVED and never finalized (rare; stuck row).
  | "unattributable" // Callback couldn't be matched to any order. Usually test/bot traffic.
  | "technical" // Malformed / ignored / test-only. No business impact.
  ;

/**
 * Which "what happened" sentence to show. The i18n layer maps this key to
 * a full localized sentence.
 */
export type EventMessageKey =
  | "success"
  | "duplicate"
  | "declined_by_acquirer"
  | "needs_review"
  | "pending"
  | "unattributable"
  | "malformed"
  | "signature_mismatch"
  | "processing_error"
  | "ignored";

/** Business-relevant kinds appear in the default "Payment activity" tab. */
export function isBusinessRelevant(kind: EventKind): boolean {
  return kind === "success" || kind === "duplicate" || kind === "failed_payment" || kind === "needs_review";
}

export type EnrichedWebhookEvent = {
  id: string;
  provider: string;
  providerLabel: string;
  createdAtISO: string;

  /** Business-friendly kind for badge + tab filtering. */
  kind: EventKind;
  /** i18n key for the "what happened" sentence. */
  messageKey: EventMessageKey;
  /** Whether this row belongs in the default "Payment activity" tab. */
  businessRelevant: boolean;

  /** Order relation, if resolvable. */
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    total: number | null;
    paymentStatus: OrderPaymentStatus;
  } | null;

  /** Extracted transaction id from the sanitized payload, if any. */
  transactionId: string | null;

  /** Technical (raw) details — only shown inside the drawer accordion. */
  technical: {
    rawStatus: string;
    httpStatus: number | null;
    errorMessage: string | null;
    payload: unknown;
  };
};

/** Fetch + enrich last N webhook events for the store. Read-only. */
export async function loadRecentWebhookEvents(params: {
  storeId: string;
  take?: number;
}): Promise<EnrichedWebhookEvent[]> {
  const take = Math.min(Math.max(1, params.take ?? 150), 500);

  const logs = await prisma.paymentWebhookLog.findMany({
    where: { storeId: params.storeId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      provider: true,
      status: true,
      orderId: true,
      httpStatus: true,
      errorMessage: true,
      createdAt: true,
      rawPayload: true,
    },
  });

  const orderIds = Array.from(new Set(logs.map((l) => l.orderId).filter((v): v is string => !!v)));
  const orderRows = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds }, storeId: params.storeId },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          paymentStatus: true,
        },
      })
    : [];
  const orderById = new Map(orderRows.map((o) => [o.id, o]));

  return logs.map((log) => enrich(log, orderById.get(log.orderId ?? "") ?? null));
}

function enrich(
  log: Pick<
    PaymentWebhookLog,
    "id" | "provider" | "status" | "orderId" | "httpStatus" | "errorMessage" | "createdAt" | "rawPayload"
  >,
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    total: unknown;
    paymentStatus: OrderPaymentStatus;
  } | null,
): EnrichedWebhookEvent {
  const cleanPayload = redactForDisplay(log.rawPayload);
  const transactionId = extractTransactionId(cleanPayload);

  const { kind, messageKey } = classify({
    rawStatus: log.status,
    errorMessage: log.errorMessage,
    hasOrder: !!order,
    orderPaid: order?.paymentStatus === "PAID",
  });

  const total =
    order?.total != null && (typeof order.total === "object" || typeof order.total === "number")
      ? Number(order.total)
      : null;

  return {
    id: log.id,
    provider: log.provider,
    providerLabel: providerLabel(log.provider),
    createdAtISO: log.createdAt.toISOString(),
    kind,
    messageKey,
    businessRelevant: isBusinessRelevant(kind),
    order: order
      ? {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName ?? null,
          total: Number.isFinite(total ?? NaN) ? (total as number) : null,
          paymentStatus: order.paymentStatus,
        }
      : null,
    transactionId,
    technical: {
      rawStatus: log.status,
      httpStatus: log.httpStatus ?? null,
      errorMessage: log.errorMessage ?? null,
      payload: cleanPayload,
    },
  };
}

function providerLabel(provider: string): string {
  switch (provider.toLowerCase()) {
    case "hyp":
      return "HYP";
    case "stripe":
      return "Stripe";
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

/**
 * Fine-grained ERROR classification. `errorMessage` is inspected only to
 * distinguish "acquirer decline" from "technical noise".
 */
function classify(input: {
  rawStatus: string;
  errorMessage: string | null;
  hasOrder: boolean;
  orderPaid: boolean;
}): { kind: EventKind; messageKey: EventMessageKey } {
  const err = (input.errorMessage || "").toLowerCase();

  if (input.rawStatus === "PROCESSED") return { kind: "success", messageKey: "success" };
  if (input.rawStatus === "DUPLICATE") return { kind: "duplicate", messageKey: "duplicate" };
  if (input.rawStatus === "IGNORED") return { kind: "technical", messageKey: "ignored" };
  if (input.rawStatus === "RECEIVED") return { kind: "pending", messageKey: "pending" };

  // rawStatus === ERROR from here on.

  // (a) Acquirer decline — a real payment attempt was refused. Only THIS
  //     should ever tell the store owner "payment was not approved".
  if (/declined|denied|approve[_ ]?failed|ccode[^0]|acquirer|3ds/i.test(err)) {
    return { kind: "failed_payment", messageKey: "declined_by_acquirer" };
  }

  // (b) Callback did not carry a valid order reference — test/bot/stale.
  if (
    /missing[_ ]order[_ ]reference|order_not_found|no[_ ]order|unknown[_ ]order/i.test(err) ||
    !input.hasOrder
  ) {
    return { kind: "unattributable", messageKey: "unattributable" };
  }

  // (c) Signature / verify failure — usually test callbacks.
  if (/apisign|signature|verify[_ ]?fail|sign[_ ]?mismatch/i.test(err)) {
    return { kind: "technical", messageKey: "signature_mismatch" };
  }

  // (d) Malformed body / schema violation / invalid JSON.
  if (/malformed|schema|invalid[_ ]json|invalid[_ ]body|parse/i.test(err)) {
    return { kind: "technical", messageKey: "malformed" };
  }

  // (e) Callback matched a real order but processing failed.
  if (input.hasOrder && !input.orderPaid) {
    return { kind: "needs_review", messageKey: "needs_review" };
  }
  if (input.hasOrder && input.orderPaid) {
    // Order already paid — the error is post-hoc noise, not a real problem.
    return { kind: "technical", messageKey: "processing_error" };
  }

  // (f) Fallback: generic processing error.
  return { kind: "technical", messageKey: "processing_error" };
}

/**
 * Extra safety net on top of `sanitizePaymentPayload`. We drop any key that
 * even *looks* like a card / signature / secret before shipping to the
 * admin client — old rows may pre-date the stricter server-side sanitizer.
 */
const DISPLAY_REDACT =
  /^(sign|signature|passp|pass|key|apikey|secret|token|holder|cvv|cvc|cardnumber|cardno|pan|expir|nomer)$/i;

function redactForDisplay(input: unknown): unknown {
  if (input == null) return null;
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.slice(0, 100).map(redactForDisplay);
  if (typeof input !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (DISPLAY_REDACT.test(key.replace(/[\s_-]+/g, ""))) continue;
    out[key] = redactForDisplay(value);
  }
  return out;
}

function extractTransactionId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const candidates = ["transactionId", "TransactionId", "Id", "id", "TransId", "ConfirmationNumber"];
  for (const k of candidates) {
    const v = p[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}
