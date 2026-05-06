import { NextResponse } from "next/server";
import { z } from "zod";
import { DeliveryType, OrderPaymentStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { notifyNewOrderToOwner } from "@/lib/notifications";
import { decodeSessionToken } from "@/lib/auth/session";
import { cookies } from "next/headers";
import {
  computeCouponDiscount,
  computePointsDiscount,
  computeSubtotal,
  computeTotal,
  snapshotDeliveryName,
  type CartLine,
} from "@/lib/checkout/compute-order";

const Schema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  deliveryOptionId: z.string(),
  address: z.string().optional(),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  redeemPoints: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const storeId = STORE_ID;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
  }

  const body = parsed.data;
  const jar = await cookies();
  const session = await decodeSessionToken(jar.get("session")?.value ?? "");

  const products = await prisma.product.findMany({
    where: {
      storeId,
      id: { in: body.items.map((i) => i.productId) },
      active: true,
    },
  });

  if (products.length !== body.items.length) {
    return NextResponse.json({ error: "Some products are unavailable" }, { status: 400 });
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartLine[] = body.items.map((i) => {
    const product = byId.get(i.productId);
    if (!product) throw new Error("missing product");
    return { product, quantity: i.quantity };
  });

  for (const { product, quantity } of lines) {
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${product.sku}` },
        { status: 400 },
      );
    }
  }

  const delivery = await prisma.deliveryOption.findFirst({
    where: { id: body.deliveryOptionId, storeId, active: true },
  });
  if (!delivery) {
    return NextResponse.json({ error: "Invalid delivery option" }, { status: 400 });
  }

  const storeSettings = await prisma.storeSettings.findUnique({ where: { storeId } });
  if (
    delivery.type === DeliveryType.PICKUP &&
    storeSettings &&
    !storeSettings.pickupEnabled
  ) {
    return NextResponse.json({ error: "Pickup is not available" }, { status: 400 });
  }

  let coupon = null as Awaited<ReturnType<typeof prisma.coupon.findFirst>>;
  if (body.couponCode?.trim()) {
    coupon = await prisma.coupon.findFirst({
      where: { storeId, code: body.couponCode.trim(), active: true },
    });
  }

  const subtotal = computeSubtotal(lines);
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
          customerEmail: body.customerEmail,
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
          address: body.address ?? null,
          notes: body.notes ?? null,
          couponCode: appliedCoupon,
          loyaltyPointsRedeemed: pointsUsed,
        },
      });

    for (const line of lines) {
      const unit = Number(line.product.price);
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

  void notifyNewOrderToOwner({
    orderId,
    orderNumber,
    customerEmail: body.customerEmail,
    customerName: body.customerName,
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
