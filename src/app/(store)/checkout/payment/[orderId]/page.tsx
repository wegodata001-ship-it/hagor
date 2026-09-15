import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPaymentProviderConfig, isPaymentConfigured } from "@/lib/payments/config";
import { STORE_ID } from "@/lib/store";
import { PaymentActions } from "@/components/payment-actions";
import { buildPaymentSuccessPath } from "@/lib/order-tracking-access";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const storeId = STORE_ID;
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: {
      id: true,
      orderNumber: true,
      subtotal: true,
      deliveryPrice: true,
      discountAmount: true,
      pointsDiscountAmount: true,
      couponCode: true,
      total: true,
      paymentStatus: true,
      status: true,
    },
  });
  if (!order) notFound();

  const [settings, paymentConfig] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { storeId }, select: { currency: true } }),
    getPaymentProviderConfig(),
  ]);
  const currency = settings?.currency ?? "ILS";
  const coupon = order.couponCode
    ? await prisma.coupon.findFirst({
        where: { storeId, code: order.couponCode },
        select: { type: true, value: true },
      })
    : null;
  const paymentReady = isPaymentConfigured(paymentConfig);
  const isPaid =
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "TEST_PAID" ||
    order.paymentStatus === "DEMO_PAID";

  let successHref = "/track-order";
  if (isPaid) {
    try {
      successHref = buildPaymentSuccessPath(order.id);
    } catch {
      successHref = "/track-order";
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-center text-2xl font-black text-white">תשלום מאובטח</h1>
      <p className="mt-2 text-center font-mono text-lg text-hagor-gold">{order.orderNumber}</p>
      <p className="mt-4 text-center text-zinc-400">
        סכום לתשלום:{" "}
        <span className="font-semibold text-white">
          {Number(order.total).toFixed(2)} {currency}
        </span>
      </p>
      <p className="mt-2 text-center text-xs text-zinc-500">המלאי יירד רק לאחר אישור תשלום מאובטח</p>
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm">
        <div className="flex justify-between gap-3 text-zinc-300">
          <span>סכום מוצרים</span>
          <span>{Number(order.subtotal).toFixed(2)} {currency}</span>
        </div>
        {order.couponCode && Number(order.discountAmount) > 0 ? (
          <div className="mt-2 flex justify-between gap-3 text-emerald-300">
            <span>
              קופון <span className="font-mono">{order.couponCode}</span>
              {coupon ? (
                <span className="text-zinc-400">
                  {" "}({coupon.type === "PERCENT" ? `${Number(coupon.value)}%` : `₪${Number(coupon.value).toFixed(2)}`})
                </span>
              ) : null}
            </span>
            <span>−{Number(order.discountAmount).toFixed(2)} {currency}</span>
          </div>
        ) : null}
        {Number(order.pointsDiscountAmount) > 0 ? (
          <div className="mt-2 flex justify-between gap-3 text-sky-300">
            <span>נקודות</span>
            <span>−{Number(order.pointsDiscountAmount).toFixed(2)} {currency}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between gap-3 text-zinc-300">
          <span>משלוח</span>
          <span>{Number(order.deliveryPrice) === 0 ? "חינם" : `${Number(order.deliveryPrice).toFixed(2)} ${currency}`}</span>
        </div>
        <div className="mt-3 flex justify-between gap-3 border-t border-zinc-800 pt-3 text-base font-bold text-white">
          <span>סה"כ לתשלום</span>
          <span className="text-hagor-gold">{Number(order.total).toFixed(2)} {currency}</span>
        </div>
      </div>
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
        <PaymentActions
          orderId={order.id}
          isPaid={isPaid}
          paymentReady={paymentReady}
          successHref={successHref}
        />
      </div>
      <Link href="/account/orders" className="mt-6 block text-center text-sm text-hagor-gold hover:underline">
        ההזמנות שלי
      </Link>
    </div>
  );
}
