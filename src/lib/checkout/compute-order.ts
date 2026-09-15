import type { Coupon, DeliveryOption, LoyaltySettings, Product } from "@prisma/client";
import { CouponType } from "@prisma/client";

export type CartLine = { product: Product; quantity: number };
export type CouponValidationStatus =
  | "none"
  | "not_found"
  | "inactive"
  | "expired"
  | "usage_limit"
  | "min_order"
  | "applied";

export type CouponComputation = {
  requestedCode: string | null;
  appliedCode: string | null;
  status: CouponValidationStatus;
  type: CouponType | null;
  value: number | null;
  minOrderAmount: number | null;
  discount: number;
};

export function computeSubtotal(lines: CartLine[]): number {
  let s = 0;
  for (const { product, quantity } of lines) {
    s += Number(product.price) * quantity;
  }
  return Math.round(s * 100) / 100;
}

export function computeCouponDiscount(
  coupon: Coupon | null,
  subtotal: number,
): { discount: number; code: string | null } {
  if (!coupon || !coupon.active) return { discount: 0, code: null };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { discount: 0, code: null };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { discount: 0, code: null };
  }
  const minA = coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : 0;
  if (subtotal < minA) return { discount: 0, code: null };

  let discount = 0;
  if (coupon.type === CouponType.PERCENT) {
    discount = (subtotal * Number(coupon.value)) / 100;
  } else {
    discount = Number(coupon.value);
  }
  discount = Math.min(discount, subtotal);
  return { discount: Math.round(discount * 100) / 100, code: coupon.code };
}

export function evaluateCoupon(
  coupon: Coupon | null,
  requestedCode: string | null | undefined,
  subtotal: number,
): CouponComputation {
  const code = requestedCode?.trim() || null;
  if (!code) {
    return {
      requestedCode: null,
      appliedCode: null,
      status: "none",
      type: null,
      value: null,
      minOrderAmount: null,
      discount: 0,
    };
  }

  if (!coupon) {
    return {
      requestedCode: code,
      appliedCode: null,
      status: "not_found",
      type: null,
      value: null,
      minOrderAmount: null,
      discount: 0,
    };
  }

  const minOrderAmount = coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : null;
  const base = {
    requestedCode: code,
    appliedCode: null,
    type: coupon.type,
    value: Number(coupon.value),
    minOrderAmount,
    discount: 0,
  } satisfies Omit<CouponComputation, "status">;

  if (!coupon.active) {
    return { ...base, status: "inactive" };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ...base, status: "expired" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ...base, status: "usage_limit" };
  }
  if (subtotal < (minOrderAmount ?? 0)) {
    return { ...base, status: "min_order" };
  }

  const { discount, code: appliedCode } = computeCouponDiscount(coupon, subtotal);
  return {
    ...base,
    appliedCode,
    status: "applied",
    discount,
  };
}

/**
 * Points discount applies AFTER coupon (and delivery is already in the payable bucket).
 * maxDiscountAmount = subtotal + delivery - couponDiscount — discount cannot exceed this.
 */
export function computePointsDiscount(
  settings: LoyaltySettings | null,
  redeemPoints: number,
  balance: number,
  maxDiscountAmount: number,
): { discount: number; pointsUsed: number } {
  if (!settings?.enabled || !settings.allowRedeem || redeemPoints <= 0) {
    return { discount: 0, pointsUsed: 0 };
  }
  if (maxDiscountAmount <= 0) return { discount: 0, pointsUsed: 0 };
  const rate = Number(settings.pointsToIlsRate);
  if (rate <= 0) return { discount: 0, pointsUsed: 0 };

  const maxPointsUsable = Math.floor(maxDiscountAmount * rate + 1e-9);
  const use = Math.min(redeemPoints, balance, maxPointsUsable);
  if (use <= 0) return { discount: 0, pointsUsed: 0 };

  let discount = Math.round((use / rate) * 100) / 100;
  discount = Math.min(discount, maxDiscountAmount);
  return { discount, pointsUsed: use };
}

export function computeTotal(params: {
  subtotal: number;
  deliveryPrice: number;
  couponDiscount: number;
  pointsDiscount: number;
}): number {
  const raw = params.subtotal + params.deliveryPrice - params.couponDiscount - params.pointsDiscount;
  return Math.max(0, Math.round(raw * 100) / 100);
}

export function snapshotDeliveryName(option: DeliveryOption, locale: "he" | "ar" | "en"): string {
  if (locale === "ar") return option.name_ar;
  if (locale === "en") return option.name_en;
  return option.name_he;
}
