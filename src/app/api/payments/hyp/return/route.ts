import { NextRequest, NextResponse } from "next/server";
import { PaymentWebhookLogStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getSiteUrl, PRODUCTION_SITE_URL } from "@/lib/site-url";
import {
  normalizeHypParams,
  resolveHypPaymentFromParams,
} from "@/lib/payments/hyp";
import { processPaymentWebhook } from "@/lib/payments/process-webhook";

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

/**
 * Browser return from Hyp Pay.
 * Source of truth = APISign VERIFY (not the mere presence of success URL).
 */
async function handleReturn(req: NextRequest) {
  const url = new URL(req.url);
  const orderedPairs = Array.from(url.searchParams.entries());
  const params = normalizeHypParams(Object.fromEntries(orderedPairs));
  const base = safeBase();

  // Never log secrets — params should not include KEY/PassP from Hyp redirects.
  const log = await prisma.paymentWebhookLog.create({
    data: {
      storeId: STORE_ID,
      provider: "hyp",
      orderId: params.Order || params.orderId || null,
      status: PaymentWebhookLogStatus.RECEIVED,
      rawPayload: params as unknown as Prisma.InputJsonValue,
      httpStatus: 200,
    },
  });

  try {
    const resolved = await resolveHypPaymentFromParams(params, { orderedPairs });

    if (resolved.storeId !== STORE_ID) {
      console.error("HYP_STORE_MISMATCH", { orderId: resolved.orderId });
      throw new Error("STORE_MISMATCH");
    }

    const order = await prisma.order.findFirst({
      where: { id: resolved.orderId, storeId: STORE_ID },
      select: { id: true, storeId: true, total: true },
    });
    if (!order || order.storeId !== STORE_ID) {
      console.error("HYP_STORE_MISMATCH", { orderId: resolved.orderId });
      throw new Error("STORE_MISMATCH");
    }

    const result = await processPaymentWebhook({
      provider: "HYP",
      orderId: resolved.orderId,
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
        orderId: resolved.orderId,
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
      ? `${base}/payment/success?orderId=${encodeURIComponent(resolved.orderId)}`
      : `${base}/payment/failed?orderId=${encodeURIComponent(resolved.orderId)}`;
    return NextResponse.redirect(dest);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "STORE_MISMATCH") {
      console.error("HYP_STORE_MISMATCH");
    }
    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id, storeId: STORE_ID },
      data: {
        status: PaymentWebhookLogStatus.ERROR,
        errorMessage: msg,
        httpStatus: 400,
      },
    });
    const orderId = params.Order || params.orderId || "";
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
