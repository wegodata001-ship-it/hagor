import { NextRequest, NextResponse } from "next/server";
import { PaymentWebhookLogStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import {
  normalizeHypParams,
  resolveHypPaymentFromParams,
} from "@/lib/payments/hyp";
import { processPaymentWebhook } from "@/lib/payments/process-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Optional Hyp Pay server notify / repeat callback.
 * Configure in Hyp Portal → post-transaction address if available:
 * https://hagourbywael.com/api/webhooks/payment/hyp?token=SECRET
 *
 * Always VERIFY via Hyp APISign — never trust raw status alone.
 */
function webhookSecret(): string | null {
  return (
    process.env.HYP_WEBHOOK_SECRET?.trim() ||
    process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
    null
  );
}

async function readParams(req: NextRequest): Promise<{
  params: Record<string, string>;
  ordered: Array<[string, string]>;
}> {
  const contentType = req.headers.get("content-type") ?? "";
  const ordered: Array<[string, string]> = [];

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    form.forEach((value, key) => {
      if (typeof value === "string") ordered.push([key, value]);
    });
    return { params: normalizeHypParams(Object.fromEntries(ordered)), ordered };
  }

  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>;
    for (const [k, v] of Object.entries(json)) {
      if (v == null) continue;
      ordered.push([k, typeof v === "string" ? v : String(v)]);
    }
    return { params: normalizeHypParams(Object.fromEntries(ordered)), ordered };
  }

  // Querystring fallback
  const url = new URL(req.url);
  for (const [k, v] of url.searchParams.entries()) ordered.push([k, v]);
  return { params: normalizeHypParams(Object.fromEntries(ordered)), ordered };
}

export async function POST(req: NextRequest) {
  const secret = webhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const urlToken = new URL(req.url).searchParams.get("token");
  const headerToken = req.headers.get("x-webhook-token");
  const effective = (headerToken ?? urlToken ?? "").trim();
  if (effective !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { params, ordered } = await readParams(req);

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
    const resolved = await resolveHypPaymentFromParams(params, { orderedPairs: ordered });
    if (resolved.storeId !== STORE_ID) {
      console.error("HYP_STORE_MISMATCH", { orderId: resolved.orderId });
      throw new Error("STORE_MISMATCH");
    }

    const order = await prisma.order.findFirst({
      where: { id: resolved.orderId, storeId: STORE_ID },
      select: { id: true, storeId: true },
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

    let finalStatus: PaymentWebhookLogStatus = PaymentWebhookLogStatus.PROCESSED;
    let errorMessage: string | null = null;
    let httpStatus = 200;
    if (!result.ok) {
      finalStatus = PaymentWebhookLogStatus.ERROR;
      errorMessage = result.message;
      httpStatus = 400;
    } else if (result.message.includes("Duplicate")) {
      finalStatus = PaymentWebhookLogStatus.DUPLICATE;
    }

    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id, storeId: STORE_ID },
      data: {
        orderId: resolved.orderId,
        status: finalStatus,
        errorMessage,
        httpStatus,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id, storeId: STORE_ID },
      data: {
        status: PaymentWebhookLogStatus.ERROR,
        errorMessage: msg,
        httpStatus: 400,
      },
    });
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
