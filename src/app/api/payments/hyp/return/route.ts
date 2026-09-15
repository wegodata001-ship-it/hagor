import { NextRequest, NextResponse } from "next/server";
import { PaymentWebhookLogStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";
import {
  normalizeHypParams,
  pickHypOrderReference,
  resolveHypPaymentFromParams,
} from "@/lib/payments/hyp";
import { processPaymentWebhook } from "@/lib/payments/process-webhook";
import { sanitizePaymentPayload } from "@/lib/payments/sanitize-payload";
import { buildPaymentSuccessUrl, createOrderTrackingToken } from "@/lib/order-tracking-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeBase(): string {
  const base = getSiteUrl();
  if (process.env.NODE_ENV === "production") {
    try {
      const host = new URL(base).hostname.toLowerCase();
      if (host === "localhost" || host.endsWith(".vercel.app") || host === "127.0.0.1") {
        return PRODUCTION_SITE_URL;
      }
    } catch {
      return PRODUCTION_SITE_URL;
    }
  }
  return base;
}

async function readHypCallback(req: NextRequest): Promise<{
  params: Record<string, string>;
  orderedPairs: Array<[string, string]>;
}> {
  const url = new URL(req.url);
  const orderedPairs: Array<[string, string]> = [];

  for (const [k, v] of url.searchParams.entries()) {
    orderedPairs.push([k, v]);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      form.forEach((value, key) => {
        if (typeof value === "string") orderedPairs.push([key, value]);
      });
    } catch {
      // ignore empty/invalid body
    }
  } else if (contentType.includes("application/json") && req.method === "POST") {
    try {
      const json = (await req.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(json)) {
        if (v == null) continue;
        orderedPairs.push([k, typeof v === "string" ? v : String(v)]);
      }
    } catch {
      // ignore
    }
  }

  return {
    params: normalizeHypParams(Object.fromEntries(orderedPairs)),
    orderedPairs,
  };
}

/** Resolve local order from Hyp `Order` only — never from Fild1/Fild2/Fild3. */
async function resolveStoreOrderId(params: Record<string, string>): Promise<string | null> {
  const direct = pickHypOrderReference(params);
  if (!direct) return null;

  const byId = await prisma.order.findFirst({
    where: { id: direct, storeId: STORE_ID },
    select: { id: true },
  });
  if (byId) return byId.id;

  const byNumber = await prisma.order.findFirst({
    where: { orderNumber: direct, storeId: STORE_ID },
    select: { id: true },
  });
  return byNumber?.id ?? null;
}

/**
 * Browser return from Hyp Pay / Portal custom success URL.
 * Ownership = DB Order from `Order` param. Proof = APISign VERIFY.
 */
async function handleReturn(req: NextRequest) {
  const { params, orderedPairs } = await readHypCallback(req);
  const base = safeBase();
  const method = req.method.toUpperCase();
  const orderRef = pickHypOrderReference(params) || null;

  console.info(
    JSON.stringify({
      scope: "hyp_return",
      stage: "received",
      method,
      orderRef,
      hasId: Boolean(params.Id || params.id),
      hasSign: Boolean(params.Sign || params.sign),
      CCode: params.CCode ?? null,
      hasAmount: Boolean(params.Amount),
      // Fild* logged only as presence — never used for ownership
      fild1Present: Boolean(params.Fild1),
      fild2Present: Boolean(params.Fild2),
      fild3Present: Boolean(params.Fild3),
    }),
  );

  const log = await prisma.paymentWebhookLog.create({
    data: {
      storeId: STORE_ID,
      provider: "hyp",
      orderId: orderRef,
      status: PaymentWebhookLogStatus.RECEIVED,
      rawPayload: sanitizePaymentPayload(params),
      httpStatus: 200,
    },
  });

  try {
    const resolved = await resolveHypPaymentFromParams(params, { orderedPairs });

    if (resolved.storeId !== STORE_ID) {
      console.error("HYP_STORE_MISMATCH", { orderId: resolved.orderId });
      throw new Error("STORE_MISMATCH");
    }

    const mappedOrderId = (await resolveStoreOrderId(params)) ?? resolved.orderId;

    const order = await prisma.order.findFirst({
      where: { id: mappedOrderId, storeId: STORE_ID },
      select: { id: true, storeId: true, total: true, orderNumber: true },
    });
    if (!order || order.storeId !== STORE_ID) {
      console.error("HYP_ORDER_NOT_FOUND", { ref: resolved.orderId, mappedOrderId });
      throw new Error("ORDER_NOT_FOUND");
    }

    console.info(
      JSON.stringify({
        scope: "hyp_return",
        stage: "verified_callback",
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: resolved.amount,
        success: resolved.success,
        hasTransactionId: Boolean(resolved.transactionId),
        cCode: params.CCode ?? null,
      }),
    );

    const result = await processPaymentWebhook({
      provider: "HYP",
      orderId: order.id,
      amount: resolved.amount,
      currency: resolved.currency,
      success: resolved.success,
      transactionId: resolved.transactionId,
      confirmationNumber: resolved.confirmationNumber,
      rawPayload: resolved.rawPayload,
    });

    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id, storeId: STORE_ID },
      data: {
        orderId: order.id,
        status: result.ok
          ? result.message.includes("Duplicate")
            ? PaymentWebhookLogStatus.DUPLICATE
            : PaymentWebhookLogStatus.PROCESSED
          : PaymentWebhookLogStatus.ERROR,
        errorMessage: result.ok ? null : result.message,
        httpStatus: result.ok ? 200 : 400,
      },
    });

    let dest = `${base}/payment/failed?orderId=${encodeURIComponent(order.id)}`;
    if (resolved.success) {
      try {
        dest = buildPaymentSuccessUrl(order.id);
      } catch {
        try {
          const token = createOrderTrackingToken(order.id);
          dest = `${base}/payment/success?t=${encodeURIComponent(token)}`;
        } catch {
          console.error("[hyp/return] SUCCESS_TOKEN_MISSING", order.id);
          dest = `${base}/track-order`;
        }
      }
    }
    return NextResponse.redirect(dest);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("HYP_RETURN_ERROR", msg, {
      keys: Object.keys(params).filter((k) => !/^(KEY|PassP|Passp|Sign|signature)$/i.test(k)),
      hasOrder: Boolean(pickHypOrderReference(params)),
      hasId: Boolean(params.Id || params.id),
      hasSign: Boolean(params.Sign || params.sign),
      cCode: params.CCode ?? null,
    });
    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id, storeId: STORE_ID },
      data: {
        status: PaymentWebhookLogStatus.ERROR,
        errorMessage: msg,
        httpStatus: 400,
      },
    });
    const orderId =
      (await resolveStoreOrderId(params)) || pickHypOrderReference(params) || "";
    const dest = orderId
      ? `${base}/payment/failed?orderId=${encodeURIComponent(orderId)}`
      : `${base}/payment/failed`;
    return NextResponse.redirect(dest);
  }
}

export async function GET(req: NextRequest) {
  return handleReturn(req);
}

export async function POST(req: NextRequest) {
  return handleReturn(req);
}
