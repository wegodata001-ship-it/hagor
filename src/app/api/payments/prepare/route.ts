import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";

const Schema = z.object({ orderId: z.string() });

/** Returns order payment summary for client-side PSP integration. */
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

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, storeId },
    select: {
      id: true,
      total: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });

  return NextResponse.json({
    orderId: order.id,
    amount: Number(order.total),
    currency: settings?.currency ?? "ILS",
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    webhookUrl: `/api/webhooks/payment/your-provider`,
  });
}
