/**
 * Regression tests for checkout coupon evaluation and total calculation.
 * Run: npx tsx src/lib/checkout/compute-order.test.ts
 */
import assert from "node:assert/strict";
import { CouponType, Prisma } from "@prisma/client";
import { computeTotal, evaluateCoupon } from "./compute-order";

async function run() {
  const now = new Date();

  const percentCoupon = {
    id: "c1",
    storeId: "hagor",
    code: "HAGOR10",
    type: CouponType.PERCENT,
    value: new Prisma.Decimal(10),
    minOrderAmount: new Prisma.Decimal(0),
    usageLimit: null,
    usedCount: 0,
    active: true,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  };

  {
    const res = evaluateCoupon(percentCoupon, "HAGOR10", 400);
    assert.equal(res.status, "applied");
    assert.equal(res.discount, 40);
    assert.equal(res.appliedCode, "HAGOR10");
    assert.equal(
      computeTotal({ subtotal: 400, deliveryPrice: 0, couponDiscount: res.discount, pointsDiscount: 0 }),
      360,
    );
  }

  {
    const res = evaluateCoupon(null, "NOPE", 400);
    assert.equal(res.status, "not_found");
    assert.equal(res.discount, 0);
  }

  {
    const expired = { ...percentCoupon, code: "OLD10", expiresAt: new Date(now.getTime() - 60_000) };
    const res = evaluateCoupon(expired, "OLD10", 400);
    assert.equal(res.status, "expired");
    assert.equal(res.discount, 0);
  }

  {
    const minimum = { ...percentCoupon, code: "MIN500", minOrderAmount: new Prisma.Decimal(500) };
    const res = evaluateCoupon(minimum, "MIN500", 400);
    assert.equal(res.status, "min_order");
    assert.equal(res.discount, 0);
  }

  {
    const fixed = { ...percentCoupon, code: "SAVE50", type: CouponType.FIXED, value: new Prisma.Decimal(50) };
    const res = evaluateCoupon(fixed, "SAVE50", 400);
    assert.equal(res.status, "applied");
    assert.equal(res.discount, 50);
    assert.equal(
      computeTotal({ subtotal: 400, deliveryPrice: 0, couponDiscount: res.discount, pointsDiscount: 0 }),
      350,
    );
  }

  {
    const res = evaluateCoupon(percentCoupon, "HAGOR10", 500);
    assert.equal(res.discount, 50);
  }

  console.log("checkout coupon tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
