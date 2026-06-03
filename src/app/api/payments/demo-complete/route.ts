import { NextResponse } from "next/server";
import { z } from "zod";
import { completeDemoPayment } from "@/lib/payments/process-demo-payment";
import { isDemoPaymentAllowed } from "@/lib/payments/demo-guard";

export const runtime = "nodejs";

const Schema = z.object({ orderId: z.string().min(1) });

export async function POST(req: Request) {
  if (!isDemoPaymentAllowed()) {
    return NextResponse.json({ error: "תשלום דמו אינו פעיל במערכת." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "לא נמצאה הזמנה תקינה לתשלום." }, { status: 400 });
  }

  const result = await completeDemoPayment(parsed.data.orderId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: result.message });
}
