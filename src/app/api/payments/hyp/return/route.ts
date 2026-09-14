import { NextRequest, NextResponse } from "next/server";
import { PaymentWebhookLogStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";
import {
  normalizeHypParams,
  pickHypOrderNumberHint,
  pickHypOrderReference,
  resolveHypPaymentFromParams,
} from "@/lib/payments/hyp";
import { processPaymentWebhook } from "@/lib/payments/process-webhook";
import { sanitizePaymentPayload } from "@/lib/payments/sanitize-payload";

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

  // Querystring first (typical Hyp browser redirect).
  for (const [k, v] of url.searchParams.entries()) {
    orderedPairs.push([k, v]);
  }

  // Hyp may POST form fields instead of (or in addition to) query params.
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

async function resolveStoreOrderId(params: Record<string, string>): Promise<string | null> {
  const direct = pickHypOrderReference(params);
  if (direct) {
    const byId = await prisma.order.findFirst({
      where: { id: direct, storeId: STORE_ID },
      select: { id: true },
    });
    if (byId) return byId.id;

    const byNumber = await prisma.order.findFirst({
      where: { orderNumber: direct, storeId: STORE_ID },
      select: { id: true },
    });
    if (byNumber) return byNumber.id;
  }

  const hint = pickHypOrderNumberHint(params);
  if (hint) {
    const byNumber = await prisma.order.findFirst({
      where: { orderNumber: hint, storeId: STORE_ID },
      select: { id: true },
    });
    if (byNumber) return byNumber.id;
  }

  return null;
}

/**
 * Browser return / notify from Hyp Pay.
 * Source of truth = APISign VERIFY (not the mere presence of success URL).
 */
async function handleReturn(req: NextRequest) {
  const { params, orderedPairs } = await readHypCallback(req);
  const base = safeBase();

  const preliminaryOrderId =
    pickHypOrderReference(params) || pickHypOrderNumberHint(params) || null;

  // Never log secrets — sanitize before DB write.
  const log = await prisma.paymentWebhookLog.create({
    data: {
      storeId: STORE_ID,
      provider: "hyp",
      orderId: preliminaryOrderId,
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
      console.error("HYP_ORDER_NOT_FOUND", {
        ref: resolved.orderId,
        mappedOrderId,
        fild2: pickHypOrderNumberHint(params),
      });
      throw new Error("ORDER_NOT_FOUND");
    }

    console.info(
      JSON.stringify({
        scope: "hyp_return",
        message: "verified_callback",
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: resolved.amount,
        success: resolved.success,
        transactionId: resolved.transactionId ?? null,
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

    const dest = resolved.success
      ? `${base}/payment/success?orderId=${encodeURIComponent(order.id)}`
      : `${base}/payment/failed?orderId=${encodeURIComponent(order.id)}`;
    return NextResponse.redirect(dest);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "STORE_MISMATCH" || msg === "ORDER_NOT_FOUND" || msg === "HYP_VERIFY_FAILED") {
      console.error("HYP_RETURN_ERROR", msg, {
        keys: Object.keys(params),
        hasOrder: Boolean(pickHypOrderReference(params)),
        hasSign: Boolean(params.Sign || params.signature),
        cCode: params.CCode ?? null,
      });
    }
    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id, storeId: STORE_ID },
      data: {
        status: PaymentWebhookLogStatus.ERROR,
        errorMessage: msg,
        httpStatus: 400,
      },
    });
    const orderId =
      (await resolveStoreOrderId(params)) ||
      pickHypOrderReference(params) ||
      pickHypOrderNumberHint(params) ||
      "";
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
