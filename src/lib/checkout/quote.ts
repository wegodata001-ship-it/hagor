import type {
  CouponType,
  DeliveryOption,
  LoyaltySettings,
  Prisma,
  Product,
  ProductVariantOption,
} from "@prisma/client";
import { DeliveryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computePointsDiscount,
  computeTotal,
  evaluateCoupon,
  snapshotDeliveryName,
  type CouponComputation,
} from "./compute-order";
import { parseSelectedOptions, resolveCategoryOptionProfile, resolveFixedBuckleType, validateSelectedOptionsForProfile } from "@/lib/hagour-product-options";

type Locale = "he" | "ar" | "en";

export type CheckoutQuoteItemInput = {
  productId: string;
  quantity: number;
  optionIds?: string[];
  selectedOptions?: unknown;
};

type ProductWithCategory = Product & { category: { id: string } };

export type CheckoutQuoteLine = {
  product: ProductWithCategory;
  quantity: number;
  optionIds: string[];
  selectedOptions: ReturnType<typeof parseSelectedOptions>;
  unitPrice: number;
  lineTotal: number;
};

export type CheckoutQuoteResult = {
  lines: CheckoutQuoteLine[];
  delivery: DeliveryOption;
  deliveryName: string;
  subtotal: number;
  deliveryPrice: number;
  coupon: CouponComputation;
  pointsDiscount: number;
  pointsUsed: number;
  pointsBalance: number;
  total: number;
  currency: string;
  customerProfileId: string | null;
};

type BuildCheckoutQuoteInput = {
  storeId: string;
  locale: Locale;
  deliveryOptionId: string;
  items: CheckoutQuoteItemInput[];
  couponCode?: string;
  redeemPoints?: number;
  customerUserId?: string | null;
};

function checkoutMessage(locale: Locale, he: string, ar: string, en: string): string {
  if (locale === "ar") return ar;
  if (locale === "en") return en;
  return he;
}

async function computeUnitPriceWithVariants(
  db: Prisma.TransactionClient | typeof prisma,
  storeId: string,
  productId: string,
  optionIds: string[],
): Promise<number> {
  const base = await db.product.findFirst({ where: { id: productId, storeId }, select: { price: true } });
  const basePrice = base ? Number(base.price) : 0;
  const uniq = Array.from(new Set((optionIds ?? []).map(String)));
  if (uniq.length === 0) return basePrice;

  const opts = await db.productVariantOption.findMany({
    where: {
      id: { in: uniq },
      group: { productId },
    },
    select: { priceAdd: true },
  });
  const add = opts.reduce((sum, opt) => sum + Number(opt.priceAdd), 0);
  return Math.round((basePrice + add) * 100) / 100;
}

export async function computeSubtotalWithVariants(
  storeId: string,
  lines: Array<{ product: { id: string }; quantity: number; optionIds: string[] }>,
): Promise<number> {
  let subtotal = 0;
  for (const line of lines) {
    const unitPrice = await computeUnitPriceWithVariants(prisma, storeId, line.product.id, line.optionIds);
    subtotal += unitPrice * line.quantity;
  }
  return Math.round(subtotal * 100) / 100;
}

export async function buildCheckoutQuote(input: BuildCheckoutQuoteInput): Promise<CheckoutQuoteResult> {
  const { storeId, locale, items, deliveryOptionId } = input;

  const products = await prisma.product.findMany({
    where: {
      storeId,
      id: { in: items.map((item) => item.productId) },
      active: true,
    },
    include: {
      category: { select: { id: true } },
    },
  });

  if (products.length !== items.length) {
    throw new Error("Some products are unavailable");
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const lines: CheckoutQuoteLine[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) throw new Error("Some products are unavailable");

    const selectedOptions = parseSelectedOptions(item.selectedOptions);
    const profile = resolveCategoryOptionProfile(undefined, product.category.id);
    const fixedBuckle = resolveFixedBuckleType(product.id);
    const optionsError = validateSelectedOptionsForProfile(profile, selectedOptions, fixedBuckle);
    if (optionsError) throw new Error(optionsError);

    const optionIds = Array.from(new Set((item.optionIds ?? []).map(String))).filter(Boolean);
    const unitPrice = await computeUnitPriceWithVariants(prisma, storeId, product.id, optionIds);
    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;

    lines.push({
      product,
      quantity: item.quantity,
      optionIds,
      selectedOptions,
      unitPrice,
      lineTotal,
    });
  }

  const [delivery, storeSettings] = await Promise.all([
    prisma.deliveryOption.findFirst({
      where: { id: deliveryOptionId, storeId, active: true },
    }),
    prisma.storeSettings.findUnique({
      where: { storeId },
      select: {
        currency: true,
        pickupEnabled: true,
      },
    }),
  ]);

  if (!delivery) {
    throw new Error(
      checkoutMessage(locale, "אופן המשלוח שנבחר אינו זמין.", "طريقة الشحن غير صالحة.", "Selected delivery option is unavailable."),
    );
  }

  if (delivery.type === DeliveryType.PICKUP && storeSettings && !storeSettings.pickupEnabled) {
    throw new Error(checkoutMessage(locale, "Pickup is not available", "الاستلام غير متاح", "Pickup is not available"));
  }

  const requestedCouponCode = input.couponCode?.trim() || "";
  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
  const couponRecord = requestedCouponCode
    ? await prisma.coupon.findFirst({
        where: { storeId, code: requestedCouponCode },
      })
    : null;
  const coupon = evaluateCoupon(couponRecord, requestedCouponCode, subtotal);

  let customerProfileId: string | null = null;
  let pointsBalance = 0;
  if (input.customerUserId) {
    const user = await prisma.user.findFirst({
      where: { id: input.customerUserId, storeId },
      include: { customerProfile: true },
    });
    if (user?.customerProfile) {
      customerProfileId = user.customerProfile.id;
      pointsBalance = user.customerProfile.pointsBalance;
    }
  }

  const loyalty = await prisma.loyaltySettings.findUnique({ where: { storeId } });
  const deliveryPrice = Number(delivery.price);
  const remainingAfterCoupon = Math.round((subtotal + deliveryPrice - coupon.discount) * 100) / 100;
  const { discount: pointsDiscount, pointsUsed } = computePointsDiscount(
    loyalty,
    input.redeemPoints ?? 0,
    pointsBalance,
    remainingAfterCoupon,
  );

  return {
    lines,
    delivery,
    deliveryName: snapshotDeliveryName(delivery, locale),
    subtotal,
    deliveryPrice,
    coupon,
    pointsDiscount,
    pointsUsed,
    pointsBalance,
    total: computeTotal({
      subtotal,
      deliveryPrice,
      couponDiscount: coupon.discount,
      pointsDiscount,
    }),
    currency: storeSettings?.currency ?? "ILS",
    customerProfileId,
  };
}

export function describeCouponType(type: CouponType | null, value: number | null): string | null {
  if (!type || value == null) return null;
  return type === "PERCENT" ? `${value}%` : `₪${value.toFixed(2)}`;
}

