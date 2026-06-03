import { NextResponse } from "next/server";
import { z } from "zod";
import { completeTestPayment } from "@/lib/payments/process-test-payment";
import { isTestPaymentAllowed } from "@/lib/payments/test-payment-guard";

export const runtime = "nodejs";

const Schema = z.object({ orderId: z.string().min(1) });

export async function POST(req: Request) {
  if (!isTestPaymentAllowed()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const result = await completeTestPayment(parsed.data.orderId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: result.message });
}
