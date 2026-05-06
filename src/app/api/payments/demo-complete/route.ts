import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { getSession } from "@/lib/auth/session";
import { processPaymentWebhook } from "@/lib/payments/process-webhook";
import { assertAdmin } from "@/lib/auth/scope";
import { OrderPaymentStatus } from "@prisma/client";

const Schema = z.object({ orderId: z.string() });

/** Completes payment in development/demo — gated by ALLOW_DEMO_PAYMENT or admin session. */
export async function POST(req: Request) {
  const storeId = getStoreId();
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const session = await getSession();
  const demoOk = process.env.ALLOW_DEMO_PAYMENT === "true";
  let allowed = demoOk;
  if (!allowed && session) {
    try {
      assertAdmin(session);
      allowed = true;
    } catch {
      const order = await prisma.order.findFirst({
        where: { id: parsed.data.orderId, storeId },
        include: { customerProfile: { include: { user: true } } },
      });
      if (
        order?.customerProfile?.userId &&
        order.customerProfile.userId === session.userId
      ) {
        allowed = true;
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, storeId },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.paymentStatus === OrderPaymentStatus.PAID) {
    return NextResponse.json({ ok: true, message: "Already paid" });
  }

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  const currency = settings?.currency ?? "ILS";

  const result = await processPaymentWebhook({
    provider: "demo",
    orderId: order.id,
    amount: Number(order.total),
    currency,
    success: true,
    transactionId: `demo-${order.id}-${Date.now()}`,
    confirmationNumber: `DEMO-${Date.now()}`,
    rawPayload: { demo: true },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: result.message });
}
