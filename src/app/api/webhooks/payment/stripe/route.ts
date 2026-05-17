import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PaymentWebhookLogStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getPaymentProviderConfig } from "@/lib/payments/config";
import { parseStripeWebhookEvent } from "@/lib/payments/stripe";
import { processPaymentWebhook } from "@/lib/payments/process-webhook";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const provider = "stripe";
  const rawBody = await req.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = await getPaymentProviderConfig();
  const stripeSecret = config.webhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");

  if (stripeSecret && sig) {
    const valid = verifyStripeSignature(rawBody, sig, stripeSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const parsed = parseStripeWebhookEvent(json);
  if (!parsed) {
    await prisma.paymentWebhookLog.create({
      data: {
        storeId: STORE_ID,
        provider,
        status: PaymentWebhookLogStatus.IGNORED,
        rawPayload: json as Prisma.InputJsonValue,
        httpStatus: 200,
        errorMessage: "Unhandled event type",
      },
    });
    return NextResponse.json({ ok: true, message: "Ignored" });
  }

  const log = await prisma.paymentWebhookLog.create({
    data: {
      storeId: STORE_ID,
      provider,
      orderId: parsed.orderId,
      status: PaymentWebhookLogStatus.RECEIVED,
      rawPayload: json as Prisma.InputJsonValue,
      httpStatus: 200,
    },
  });

  try {
    const result = await processPaymentWebhook({
      provider,
      orderId: parsed.orderId,
      amount: parsed.amount,
      currency: parsed.currency,
      success: parsed.success,
      transactionId: parsed.transactionId,
      rawPayload: json,
    });

    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id },
      data: {
        status: result.ok ? PaymentWebhookLogStatus.PROCESSED : PaymentWebhookLogStatus.ERROR,
        errorMessage: result.ok ? null : result.message,
        httpStatus: result.ok ? 200 : 400,
      },
    });

    if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: result.message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id },
      data: { status: PaymentWebhookLogStatus.ERROR, errorMessage: msg, httpStatus: 500 },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  try {
    const parts = header.split(",").reduce(
      (acc, part) => {
        const [k, v] = part.split("=");
        if (k === "t") acc.t = v;
        if (k === "v1") acc.v1 = v;
        return acc;
      },
      {} as { t?: string; v1?: string },
    );
    if (!parts.t || !parts.v1) return false;
    const signed = `${parts.t}.${payload}`;
    const expected = crypto.createHmac("sha256", secret).update(signed, "utf8").digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}
