"use client";

import { useActionState } from "react";
import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";
import { OrderTimeline } from "@/components/account/order-timeline";
import { formatOrderDate, getCustomerOrderStatusLabel } from "@/lib/order-tracking";
import type { PublicTrackOrderView } from "@/lib/order-tracking-access";
import { lookupTrackOrderAction, type TrackOrderActionResult } from "./actions";

function OrderResult({ order }: { order: PublicTrackOrderView }) {
  const statusLabel = getCustomerOrderStatusLabel({
    status: order.status as OrderStatus,
    paymentStatus: order.paymentStatus as OrderPaymentStatus,
    fulfillmentStatus: order.fulfillmentStatus as OrderFulfillmentStatus,
  });

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">מספר הזמנה</p>
          <h2 className="mt-1 font-mono text-2xl font-black text-white">{order.orderNumber}</h2>
          <p className="mt-2 text-sm text-zinc-400">תאריך: {formatOrderDate(order.createdAt)}</p>
          <p className="mt-1 text-sm text-zinc-400">לקוח: {order.customerName}</p>
        </div>
        <div className="text-start md:text-end">
          <span className="inline-flex rounded-full bg-hagor-gold/15 px-3 py-1 text-sm font-semibold text-hagor-gold">
            {statusLabel}
          </span>
          <p className="mt-3 text-2xl font-bold text-white">₪{order.total.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-zinc-300">מעקב התקדמות</h3>
          <div className="mt-4">
            <OrderTimeline
              status={order.status as OrderStatus}
              paymentStatus={order.paymentStatus as OrderPaymentStatus}
              fulfillmentStatus={order.fulfillmentStatus as OrderFulfillmentStatus}
            />
          </div>
          {order.trackingNumber ? (
            <div className="mt-6 rounded-xl border border-hagor-gold/30 bg-hagor-gold/5 p-4">
              <p className="text-xs text-zinc-500">מספר מעקב משלוח</p>
              <p className="mt-1 font-mono text-base font-semibold text-hagor-gold" dir="ltr">
                {order.trackingNumber}
              </p>
              {order.courierName ? <p className="mt-2 text-sm text-zinc-300">{order.courierName}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">מוצרים</h3>
            <ul className="mt-3 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
              {order.items.map((item, idx) => (
                <li key={`${item.productName}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-zinc-100">{item.productName}</p>
                    <p className="text-zinc-500">×{item.quantity}</p>
                  </div>
                  <p className="font-semibold text-hagor-gold">₪{item.totalPrice.toFixed(2)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 text-sm text-zinc-400">
              <div className="flex justify-between">
                <dt>משלוח ({order.deliveryOptionName})</dt>
                <dd>₪{order.deliveryPrice.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-base font-bold text-white">
                <dt>סה״כ</dt>
                <dd className="text-hagor-gold">₪{order.total.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          {order.address ? (
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">כתובת משלוח</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{order.address}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export function TrackOrderClient({
  initialOrder,
  tokenError,
}: {
  initialOrder: PublicTrackOrderView | null;
  tokenError?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: TrackOrderActionResult | null, formData: FormData) => lookupTrackOrderAction(formData),
    null as TrackOrderActionResult | null,
  );

  const order = state?.ok ? state.order : initialOrder;

  return (
    <div>
      {!order ? (
        <form action={formAction} className="mx-auto max-w-md space-y-4">
          <label className="block text-sm text-zinc-300">
            מספר הזמנה
            <input
              name="orderNumber"
              required
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-white outline-none focus:border-hagor-gold"
              placeholder="לדוגמה HAG-..."
              autoComplete="off"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            טלפון או אימייל
            <input
              name="phoneOrEmail"
              required
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-hagor-gold"
              placeholder="כפי שנרשם בהזמנה"
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={pending} className="hagor-btn w-full disabled:opacity-60">
            {pending ? "בודק..." : "מעקב הזמנה"}
          </button>
        </form>
      ) : null}

      {tokenError && !order ? (
        <p className="mt-4 text-center text-sm text-red-300">קישור המעקב אינו תקף או שפג תוקפו.</p>
      ) : null}

      {state && !state.ok ? <p className="mt-4 text-center text-sm text-red-300">{state.error}</p> : null}

      {order ? <OrderResult order={order} /> : null}
    </div>
  );
}
