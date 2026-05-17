import { NextResponse } from "next/server";
import { z } from "zod";
import { createPaymentSession } from "@/lib/payments";

export const runtime = "nodejs";

const BodySchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const session = await createPaymentSession(parsed.data.orderId);
    return NextResponse.json({
      ok: true,
      provider: session.provider,
      redirectUrl: session.redirectUrl,
      externalSessionId: session.externalSessionId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Payment initiation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
