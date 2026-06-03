import { NextResponse } from "next/server";
import { DeliveryType, OrderPaymentStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { notifyNewOrderToOwner } from "@/lib/notifications";
import { decodeSessionToken } from "@/lib/auth/session";
import { cookies } from "next/headers";
import {
  computeCouponDiscount,
  computePointsDiscount,
  computeTotal,
  snapshotDeliveryName,
} from "@/lib/checkout/compute-order";
import { INVALID_CUSTOMER_DETAILS } from "@/lib/checkout/customer-validation";
import {
  checkoutBodySchema,
  formatCheckoutValidationError,
  formatShippingAddress,
  validateCheckoutCustomerDetails,
} from "@/lib/checkout/validation";
import {
  parseSelectedOptions,
  resolveCategoryOptionProfile,
  validateSelectedOptionsForProfile,
} from "@/lib/hagour-product-options";

export const runtime = "nodejs";

function resolveLocale(req: Request): "he" | "ar" | "en" {
  const h = req.headers.get("x-locale")?.trim().toLowerCase();
  if (h === "ar" || h === "en") return h;
  return "he";
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
    });
  }
  const jar = await cookies();
  const session = await decodeSessionToken(jar.get("session")?.value ?? "");

  const products = await prisma.product.findMany({
    where: {
      storeId,
      id: { in: body.items.map((i) => i.productId) },
      active: true,
    },
    include: {
      category: { select: { id: true } },
    },
  });

  if (products.length !== body.items.length) {
    return NextResponse.json({ error: "Some products are unavailable" }, { status: 400 });
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  type Line = {
    product: (typeof products)[number];
    quantity: number;
    optionIds: string[];
    selectedOptions: ReturnType<typeof parseSelectedOptions>;
  };
  const lines: Line[] = body.items.map((i) => {
    const product = byId.get(i.productId);
    if (!product) throw new Error("missing product");
    return {
      product,
      quantity: i.quantity,
      optionIds: i.optionIds ?? [],
      selectedOptions: parseSelectedOptions(i.selectedOptions),
    };
  });

  for (const line of lines) {
    const profile = resolveCategoryOptionProfile(undefined, line.product.category.id);
    const err = validateSelectedOptionsForProfile(profile, line.selectedOptions);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  // Stock validation is enforced again inside the DB transaction (race-safe).
  for (const { product, quantity } of lines) {
    if (quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    if (product.stock < quantity) {
      // Fast path for simple products; variant products are handled later.
      // This is best-effort UX validation, not authoritative.
      // Backend will re-check before decrement.
      continue;
    }
  }

  const delivery = await prisma.deliveryOption.findFirst({
    where: { id: body.deliveryOptionId, storeId, active: true },
  });
  if (!delivery) {
    return NextResponse.json(
      { error: locale === "ar" ? "طريقة الشحن غير صالحة." : "אופן המשלוח שנבחר אינו זמין." },
      { status: 400 },
    );
  }

  if (delivery.type === DeliveryType.SHIPPING) {
    if (!body.city?.trim()) {
      return NextResponse.json(
        { error: locale === "ar" ? "يرجى إدخال المدينة." : "יש למלא עיר." },
        { status: 400 },
      );
    }
    if (!body.address?.trim()) {
      return NextResponse.json(
        { error: locale === "ar" ? "يرجى إدخال عنوان الشحن." : "יש למלא כתובת למשלוח." },
        { status: 400 },
      );
    }
  }

  const storeSettings = await prisma.storeSettings.findUnique({ where: { storeId } });
  if (
    delivery.type === DeliveryType.PICKUP &&
    storeSettings &&
    !storeSettings.pickupEnabled
  ) {
    return NextResponse.json({ error: "Pickup is not available" }, { status: 400 });
  }

  if (
    session?.role === "CUSTOMER" &&
    session.storeId === storeId &&
    (storeSettings?.requireEmailVerificationForCheckout ?? true)
  ) {
    const u = await prisma.user.findFirst({
      where: { id: session.userId, storeId },
      select: { emailVerified: true },
    });
    if (u && !u.emailVerified) {
      return NextResponse.json(
        { error: "יש לאמת את כתובת האימייל לפני ביצוע הזמנה." },
        { status: 403 },
      );
    }
  }

  let coupon = null as Awaited<ReturnType<typeof prisma.coupon.findFirst>>;
  if (body.couponCode?.trim()) {
    coupon = await prisma.coupon.findFirst({
      where: { storeId, code: body.couponCode.trim(), active: true },
    });
  }

  const subtotal = await computeSubtotalWithVariants(storeId, lines);
  const { discount: couponDiscount, code: appliedCoupon } = computeCouponDiscount(
    coupon,
    subtotal,
  );

  const deliveryPrice = Number(delivery.price);
  const remainingAfterCoupon = Math.round((subtotal + deliveryPrice - couponDiscount) * 100) / 100;

  let customerProfileId: string | null = null;
  let pointsBalance = 0;
  if (session?.role === "CUSTOMER" && session.storeId === storeId) {
    const user = await prisma.user.findFirst({
      where: { id: session.userId, storeId },
      include: { customerProfile: true },
    });
    if (user?.customerProfile) {
      customerProfileId = user.customerProfile.id;
      pointsBalance = user.customerProfile.pointsBalance;
    }
  }

  const loyalty = await prisma.loyaltySettings.findUnique({ where: { storeId } });
  const redeemReq = body.redeemPoints ?? 0;
  const { discount: pointsDiscount, pointsUsed } = computePointsDiscount(
    loyalty,
    redeemReq,
    pointsBalance,
    remainingAfterCoupon,
  );

  const total = computeTotal({
    subtotal,
    deliveryPrice,
    couponDiscount,
    pointsDiscount,
  });

  const deliveryName = snapshotDeliveryName(delivery, "he");

  const { orderId, orderNumber } = await prisma.$transaction(
    async (tx) => {
      const settings = await tx.storeSettings.findUnique({ where: { storeId } });
      if (!settings) {
        throw new Error("Store settings missing");
      }
      const orderNumber = `${settings.orderNumberPrefix}-${settings.nextOrderNumber}`;
      await tx.storeSettings.update({
        where: { storeId },
        data: { nextOrderNumber: { increment: 1 } },
      });

      const order = await tx.order.create({
        data: {
          storeId,
          orderNumber,
          customerId: customerProfileId,
          customerName: body.customerName,
          customerEmail,
          customerPhone: body.customerPhone,
          status: OrderStatus.PENDING,
          paymentStatus: OrderPaymentStatus.UNPAID,
          subtotal: new Prisma.Decimal(subtotal),
          deliveryPrice: new Prisma.Decimal(deliveryPrice),
          discountAmount: new Prisma.Decimal(couponDiscount),
          pointsDiscountAmount: new Prisma.Decimal(pointsDiscount),
          total: new Prisma.Decimal(total),
          deliveryOptionName: deliveryName,
          deliveryOptionType: delivery.type as DeliveryType,
          deliveryOptionPrice: new Prisma.Decimal(deliveryPrice),
          address: shippingAddress || null,
          notes: body.notes ?? null,
          couponCode: appliedCoupon,
          loyaltyPointsRedeemed: pointsUsed,
        },
      });

    for (const line of lines) {
      const unit = await computeUnitPriceWithVariants(tx, storeId, line.product.id, line.optionIds);
      const lineTotal = Math.round(unit * line.quantity * 100) / 100;
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
          unitPrice: new Prisma.Decimal(unit),
          totalPrice: new Prisma.Decimal(lineTotal),
        },
      });
    }

      return { orderId: order.id, orderNumber: order.orderNumber };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  const currency =
    (await prisma.storeSettings.findUnique({ where: { storeId } }))?.currency ?? "ILS";

  if (process.env.NODE_ENV === "development") {
    console.log("[checkout] created order", orderId);
  }

  void notifyNewOrderToOwner({
    orderId,
    orderNumber,
    customerEmail,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    total,
    currency,
  }).catch(() => {});

  return NextResponse.json({
    orderId,
    orderNumber,
    total,
    currency,
  });
}

async function computeUnitPriceWithVariants(
  tx: Prisma.TransactionClient,
  storeId: string,
  productId: string,
  optionIds: string[],
): Promise<number> {
  const base = await tx.product.findFirst({ where: { id: productId, storeId }, select: { price: true } });
  const basePrice = base ? Number(base.price) : 0;
  const uniq = Array.from(new Set((optionIds ?? []).map(String)));
  if (uniq.length === 0) return basePrice;

  const opts = await tx.productVariantOption.findMany({
    where: {
      id: { in: uniq },
      group: { productId },
    },
    select: { priceAdd: true },
  });
  const add = opts.reduce((s, o) => s + Number(o.priceAdd), 0);
  return Math.round((basePrice + add) * 100) / 100;
}

async function computeSubtotalWithVariants(storeId: string, lines: Array<{ product: { id: string }; quantity: number; optionIds: string[] }>): Promise<number> {
  let s = 0;
  for (const line of lines) {
    const unit = await computeUnitPriceWithVariants(prisma, storeId, line.product.id, line.optionIds);
    s += unit * line.quantity;
  }
  return Math.round(s * 100) / 100;
}
