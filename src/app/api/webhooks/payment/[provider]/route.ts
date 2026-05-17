import { NextRequest, NextResponse } from "next/server";
import { PaymentWebhookLogStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { parseProviderWebhook } from "@/lib/payments";
import { processPaymentWebhook } from "@/lib/payments/process-webhook";

const BodySchema = z.object({
  token: z.string().optional(),
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["success", "failed", "paid", "error"]).optional(),
  success: z.boolean().optional(),
  transactionId: z.string().nullable().optional(),
  confirmationNumber: z.string().nullable().optional(),
  rawPayload: z.unknown().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    await prisma.paymentWebhookLog.create({
      data: {
        storeId: STORE_ID,
        provider,
        status: PaymentWebhookLogStatus.ERROR,
        errorMessage: "Invalid webhook body schema",
        rawPayload: json === undefined ? Prisma.JsonNull : (json as Prisma.InputJsonValue),
        httpStatus: 400,
      },
    });
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const headerToken = req.headers.get("x-webhook-token");
  const bodyToken = parsed.data.token;
  const effectiveToken = headerToken ?? bodyToken;
  if (effectiveToken !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orderId = parsed.data.orderId;
  let amount = parsed.data.amount;
  let currency = parsed.data.currency;
  let transactionId = parsed.data.transactionId;
  let confirmationNumber = parsed.data.confirmationNumber;
  const rawPayload = parsed.data.rawPayload ?? json;

  let okFlag = parsed.data.success ?? false;
  if (parsed.data.status === "success" || parsed.data.status === "paid") okFlag = true;
  if (parsed.data.status === "failed" || parsed.data.status === "error") okFlag = false;

  const providerParsed = parseProviderWebhook(provider, json);
  if (providerParsed) {
    orderId = providerParsed.orderId;
    amount = providerParsed.amount;
    currency = providerParsed.currency;
    okFlag = providerParsed.success;
    transactionId = providerParsed.transactionId ?? transactionId;
  }

  const log = await prisma.paymentWebhookLog.create({
    data: {
      storeId: STORE_ID,
      provider,
      orderId,
      status: PaymentWebhookLogStatus.RECEIVED,
      rawPayload: json === undefined ? Prisma.JsonNull : (json as Prisma.InputJsonValue),
      httpStatus: 200,
    },
  });

  let result: { ok: boolean; message: string };
  try {
    result = await processPaymentWebhook({
      provider,
      orderId,
      amount,
      currency,
      success: okFlag,
      transactionId: transactionId ?? undefined,
      confirmationNumber: confirmationNumber ?? undefined,
      rawPayload,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.paymentWebhookLog.updateMany({
      where: { id: log.id, storeId: STORE_ID },
      data: {
        status: PaymentWebhookLogStatus.ERROR,
        errorMessage: msg,
        httpStatus: 500,
      },
    });
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }

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
      status: finalStatus,
      errorMessage,
      httpStatus,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: result.message });
}
