import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionToken } from "@/lib/auth/session";
import { STORE_ID } from "@/lib/store";
import { buildCheckoutQuote, describeCouponType } from "@/lib/checkout/quote";
import { checkoutQuoteSchema, formatCheckoutValidationError } from "@/lib/checkout/validation";

export const runtime = "nodejs";

function resolveLocale(req: Request): "he" | "ar" | "en" {
  const h = req.headers.get("x-locale")?.trim().toLowerCase();
  if (h === "ar" || h === "en") return h;
  return "he";
}

export async function POST(req: Request) {
  const locale = resolveLocale(req);
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = checkoutQuoteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatCheckoutValidationError(parsed.error, locale) },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const session = await decodeSessionToken(jar.get("session")?.value ?? "");

  try {
    const quote = await buildCheckoutQuote({
      storeId: STORE_ID,
      locale,
      deliveryOptionId: parsed.data.deliveryOptionId,
      couponCode: parsed.data.couponCode,
      redeemPoints: parsed.data.redeemPoints,
      items: parsed.data.items,
      customerUserId: session?.role === "CUSTOMER" && session.storeId === STORE_ID ? session.userId : null,
    });

    return NextResponse.json({
      subtotal: quote.subtotal,
      deliveryPrice: quote.deliveryPrice,
      deliveryName: quote.deliveryName,
      total: quote.total,
      currency: quote.currency,
      pointsDiscount: quote.pointsDiscount,
      pointsUsed: quote.pointsUsed,
      pointsBalance: quote.pointsBalance,
      coupon: {
        requestedCode: quote.coupon.requestedCode,
        appliedCode: quote.coupon.appliedCode,
        status: quote.coupon.status,
        type: quote.coupon.type,
        typeLabel: describeCouponType(quote.coupon.type, quote.coupon.value),
        value: quote.coupon.value,
        minOrderAmount: quote.coupon.minOrderAmount,
        discountAmount: quote.coupon.discount,
        subtotalAfterDiscount: Math.max(0, Math.round((quote.subtotal - quote.coupon.discount) * 100) / 100),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בחישוב הקופה" },
      { status: 400 },
    );
  }
}
