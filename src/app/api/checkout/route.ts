import { NextResponse } from "next/server";
import { DeliveryType, OrderPaymentStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { notifyNewOrderToOwner } from "@/lib/notifications";
import { decodeSessionToken } from "@/lib/auth/session";
import { cookies } from "next/headers";
import type { CouponValidationStatus } from "@/lib/checkout/compute-order";
import { buildCheckoutQuote } from "@/lib/checkout/quote";
import { INVALID_CUSTOMER_DETAILS } from "@/lib/checkout/customer-validation";
import {
  checkoutBodySchema,
  formatCheckoutValidationError,
  formatShippingAddress,
  validateCheckoutCustomerDetails,
} from "@/lib/checkout/validation";

export const runtime = "nodejs";

function resolveLocale(req: Request): "he" | "ar" | "en" {
  const h = req.headers.get("x-locale")?.trim().toLowerCase();
  if (h === "ar" || h === "en") return h;
  return "he";
}

function couponErrorMessage(
  status: CouponValidationStatus,
  locale: "he" | "ar" | "en",
  minOrderAmount?: number | null,
): string {
  if (status === "expired") {
    return locale === "ar" ? "انتهت صلاحية القسيمة." : locale === "en" ? "Coupon has expired." : "תוקף הקופון הסתיים.";
  }
  if (status === "usage_limit") {
    return locale === "ar"
      ? "تم الوصول إلى حد استخدام القسيمة."
      : locale === "en"
        ? "Coupon usage limit has been reached."
        : "מכסת השימוש בקופון נוצלה.";
  }
  if (status === "min_order") {
    const amount = Number(minOrderAmount ?? 0).toFixed(2);
    return locale === "ar"
      ? `القسيمة صالحة للطلبات فوق ₪${amount}.`
      : locale === "en"
        ? `Coupon is valid for orders above ₪${amount}.`
        : `הקופון תקף להזמנות מעל ₪${amount}.`;
  }
  if (status === "inactive") {
    return locale === "ar" ? "القسيمة غير مفعّلة حالياً." : locale === "en" ? "Coupon is not active." : "הקופון אינו פעיל כרגע.";
  }
  return locale === "ar" ? "رمز القسيمة غير صالح." : locale === "en" ? "Invalid coupon code." : "הקופון שהוזן אינו תקין.";
}

export async function POST(req: Request) {
  const storeId = STORE_ID;
  const locale = resolveLocale(req);
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = checkoutBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatCheckoutValidationError(parsed.error, locale) },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const customerCheck = validateCheckoutCustomerDetails(body, locale);
  if (!customerCheck.ok) {
    return NextResponse.json(
      {
        error: INVALID_CUSTOMER_DETAILS,
        fieldErrors: customerCheck.fieldErrors,
      },
      { status: 400 },
    );
  }

  const customerEmail = body.customerEmail.trim();
  const shippingAddress = formatShippingAddress(body.city, body.address);

  if (process.env.NODE_ENV === "development") {
    console.log("[checkout] payload", {
      items: body.items.length,
      deliveryOptionId: body.deliveryOptionId,
      hasCity: Boolean(body.city?.trim()),
      hasAddress: Boolean(body.address?.trim()),
      hasCouponCode: Boolean(body.couponCode?.trim()),
    });
  }

  const jar = await cookies();
  const session = await decodeSessionToken(jar.get("session")?.value ?? "");

  let quote;
  try {
    quote = await buildCheckoutQuote({
      storeId,
      locale,
      deliveryOptionId: body.deliveryOptionId,
      couponCode: body.couponCode,
      redeemPoints: body.redeemPoints,
      items: body.items,
      customerUserId: session?.role === "CUSTOMER" && session.storeId === storeId ? session.userId : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בחישוב ההזמנה" },
      { status: 400 },
    );
  }

  if (quote.delivery.type === DeliveryType.SHIPPING) {
    if (!body.city?.trim()) {
      return NextResponse.json(
        { error: locale === "ar" ? "يرجى إدخال المدينة." : locale === "en" ? "City is required." : "יש למלא עיר." },
        { status: 400 },
      );
    }
    if (!body.address?.trim()) {
      return NextResponse.json(
        {
          error:
            locale === "ar"
              ? "يرجى إدخال عنوان الشحن."
              : locale === "en"
                ? "Shipping address is required."
                : "יש למלא כתובת למשלוח.",
        },
        { status: 400 },
      );
    }
  }

  const storeSettings = await prisma.storeSettings.findUnique({ where: { storeId } });
  if (
    session?.role === "CUSTOMER" &&
    session.storeId === storeId &&
    (storeSettings?.requireEmailVerificationForCheckout ?? true)
  ) {
    const user = await prisma.user.findFirst({
      where: { id: session.userId, storeId },
      select: { emailVerified: true },
    });
    if (user && !user.emailVerified) {
      return NextResponse.json(
        { error: "יש לאמת את כתובת האימייל לפני ביצוע הזמנה." },
        { status: 403 },
      );
    }
  }

  if (body.couponCode?.trim() && quote.coupon.status !== "applied") {
    return NextResponse.json(
      { error: couponErrorMessage(quote.coupon.status, locale, quote.coupon.minOrderAmount) },
      { status: 400 },
    );
  }

  if ((body.redeemPoints ?? 0) > 0 && quote.pointsUsed === 0) {
    return NextResponse.json(
      {
        error:
          locale === "ar"
            ? "تعذر تطبيق نقاط الولاء."
            : locale === "en"
              ? "Could not apply loyalty points."
              : "לא ניתן היה להחיל את נקודות המועדון.",
      },
      { status: 400 },
    );
  }

  const { orderId, orderNumber } = await prisma.$transaction(
    async (tx) => {
      const settings = await tx.storeSettings.findUnique({ where: { storeId } });
      if (!settings) throw new Error("Store settings missing");

      const orderNumber = `${settings.orderNumberPrefix}-${settings.nextOrderNumber}`;
      await tx.storeSettings.update({
        where: { storeId },
        data: { nextOrderNumber: { increment: 1 } },
      });

      const order = await tx.order.create({
        data: {
          storeId,
          orderNumber,
          customerId: quote.customerProfileId,
          customerName: body.customerName,
          customerEmail,
          customerPhone: body.customerPhone,
          status: OrderStatus.PENDING,
          paymentStatus: OrderPaymentStatus.UNPAID,
          subtotal: new Prisma.Decimal(quote.subtotal),
          deliveryPrice: new Prisma.Decimal(quote.deliveryPrice),
          discountAmount: new Prisma.Decimal(quote.coupon.discount),
          pointsDiscountAmount: new Prisma.Decimal(quote.pointsDiscount),
          total: new Prisma.Decimal(quote.total),
          deliveryOptionName: quote.deliveryName,
          deliveryOptionType: quote.delivery.type as DeliveryType,
          deliveryOptionPrice: new Prisma.Decimal(quote.deliveryPrice),
          address: shippingAddress || null,
          notes: body.notes ?? null,
          couponCode: quote.coupon.appliedCode,
          loyaltyPointsRedeemed: quote.pointsUsed,
        },
      });

      for (const line of quote.lines) {
        const mainImg = await tx.productImage.findFirst({
          where: { productId: line.product.id, storeId, isMain: true },
        });
        const anyImg = mainImg
          ? mainImg
          : await tx.productImage.findFirst({
              where: { productId: line.product.id, storeId },
              orderBy: { sortOrder: "asc" },
            });
        await tx.orderItem.create({
          data: {
            storeId,
            orderId: order.id,
            productId: line.product.id,
            productName: line.product.name_he,
            productImage: anyImg?.url ?? null,
            variantOptionIds: Array.from(new Set((line.optionIds ?? []).map(String))).filter(Boolean),
            selectedOptions: line.selectedOptions ?? undefined,
            quantity: line.quantity,
            unitPrice: new Prisma.Decimal(line.unitPrice),
            totalPrice: new Prisma.Decimal(line.lineTotal),
          },
        });
      }

      return { orderId: order.id, orderNumber: order.orderNumber };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (process.env.NODE_ENV === "development") {
    console.log("[checkout] created order", orderId);
  }

  void notifyNewOrderToOwner({
    orderId,
    orderNumber,
    customerEmail,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    total: quote.total,
    currency: quote.currency,
  }).catch(() => {});

  return NextResponse.json({
    orderId,
    orderNumber,
    total: quote.total,
    currency: quote.currency,
  });
}
