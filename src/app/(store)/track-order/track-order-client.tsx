"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";
import { OrderTimeline } from "@/components/account/order-timeline";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import {
  formatOrderDate,
  getCustomerOrderStatusLabel,
  isOrderPaymentSettled,
} from "@/lib/order-tracking";
import type { PublicTrackOrderView } from "@/lib/order-tracking-access";
import { lookupTrackOrderAction, type TrackOrderActionResult } from "./actions";

function PdfDownloadButton({ token, lang, label }: { token: string; lang: string; label: string }) {
  const href = `/api/orders/confirmation-pdf?t=${encodeURIComponent(token)}&lang=${encodeURIComponent(lang)}`;
  return (
    <a
      href={href}
      className="hagor-btn-outline inline-flex w-full items-center justify-center gap-2 sm:w-auto"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5L16.5 12M12 3v13.5"
        />
      </svg>
      {label}
    </a>
  );
}

function OrderResult({ order }: { order: PublicTrackOrderView }) {
  const { t, lang } = useStoreI18n();
  const timelineLang = lang === "ar" || lang === "en" ? lang : "he";
  const dateLocale = lang === "en" ? "en-GB" : lang === "ar" ? "ar" : "he-IL";
  const paid = isOrderPaymentSettled(
    order.paymentStatus as OrderPaymentStatus,
    order.status as OrderStatus,
  );
  const statusLabel = getCustomerOrderStatusLabel(
    {
      status: order.status as OrderStatus,
      paymentStatus: order.paymentStatus as OrderPaymentStatus,
      fulfillmentStatus: order.fulfillmentStatus as OrderFulfillmentStatus,
      deliveryOptionType: order.deliveryOptionType,
    },
    timelineLang,
  );
  const discount = order.discountAmount + order.pointsDiscountAmount;
  const token = order.accessToken;

  return (
    <div className="mt-2 space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t("trackOrderNumber")}</p>
            <h2 className="mt-1 font-mono text-2xl font-black text-white">{order.orderNumber}</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {t("trackDate")}: {formatOrderDate(order.createdAt, dateLocale)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">{order.customerName}</p>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">{t("trackPaymentStatus")}</p>
            <span
              className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                paid ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
              }`}
            >
              {paid ? t("trackPaid") : t("trackUnpaid")}
            </span>
            <p className="mt-3 text-xs text-zinc-500">{statusLabel}</p>
            <p className="mt-2 text-2xl font-bold text-hagor-gold">₪{order.total.toFixed(2)}</p>
            <p className="text-xs text-zinc-500">{t("trackAmount")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h3 className="text-sm font-semibold text-hagor-gold">{t("trackProgress")}</h3>
          <div className="mt-4">
            <OrderTimeline
              status={order.status as OrderStatus}
              paymentStatus={order.paymentStatus as OrderPaymentStatus}
              fulfillmentStatus={order.fulfillmentStatus as OrderFulfillmentStatus}
              deliveryOptionType={order.deliveryOptionType}
              lang={timelineLang}
            />
          </div>
          {order.trackingNumber ? (
            <div className="mt-6 rounded-xl border border-hagor-gold/30 bg-hagor-gold/5 p-4">
              <p className="text-xs text-zinc-500">{t("trackCourierNumber")}</p>
              <p className="mt-1 font-mono text-base font-semibold text-hagor-gold" dir="ltr">
                {order.trackingNumber}
              </p>
              {order.courierName ? <p className="mt-2 text-sm text-zinc-300">{order.courierName}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h3 className="text-sm font-semibold text-hagor-gold">{t("trackOrderDetails")}</h3>
          <ul className="mt-3 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {order.items.map((item, idx) => (
              <li key={`${item.productName}-${idx}`} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-100">{item.productName}</p>
                    {item.variationLines?.map((line) => (
                      <p key={line} className="text-xs text-zinc-500">
                        {line}
                      </p>
                    ))}
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.quantity} × ₪{item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-hagor-gold">₪{item.totalPrice.toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 text-sm text-zinc-400">
            <div className="flex justify-between gap-3">
              <dt>{t("trackSubtotal")}</dt>
              <dd>₪{order.subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>
                {t("trackDelivery")}
                {order.deliveryOptionName ? ` (${order.deliveryOptionName})` : ""}
              </dt>
              <dd>₪{order.deliveryPrice.toFixed(2)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-3 text-emerald-400/90">
                <dt>{t("trackDiscount")}</dt>
                <dd>−₪{discount.toFixed(2)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-zinc-800 pt-2 text-base font-bold text-white">
              <dt>{t("trackGrandTotal")}</dt>
              <dd className="text-hagor-gold">₪{order.total.toFixed(2)}</dd>
            </div>
          </dl>

          {order.address && order.deliveryOptionType !== "PICKUP" ? (
            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("trackShippingAddress")}
              </h4>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{order.address}</p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        {token ? <PdfDownloadButton token={token} lang={timelineLang} label={t("trackDownloadPdf")} /> : null}
        <Link href="/products" className="hagor-btn-outline inline-flex w-full justify-center sm:w-auto">
          {t("trackContinueShopping")}
        </Link>
      </div>
    </div>
  );
}

export function TrackOrderClient({
  initialOrder,
  initialToken,
  tokenError,
}: {
  initialOrder: PublicTrackOrderView | null;
  initialToken?: string;
  tokenError?: boolean;
}) {
  const { t } = useStoreI18n();
  const [state, formAction, pending] = useActionState(
    async (_prev: TrackOrderActionResult | null, formData: FormData) => lookupTrackOrderAction(formData),
    null as TrackOrderActionResult | null,
  );

  const order = state?.ok ? state.order : initialOrder;

  return (
    <div>
      {!order ? (
        <form action={formAction} className="mx-auto max-w-md space-y-4">
          {initialToken ? <input type="hidden" name="token" value={initialToken} /> : null}
          <label className="block text-sm text-zinc-300">
            {t("trackOrderNumber")}
            <input
              name="orderNumber"
              required
              className="mt-1.5 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 font-mono text-white outline-none transition focus:border-hagor-gold"
              placeholder={t("trackOrderNumberPlaceholder")}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            {t("trackContactLabel")}
            <input
              name="phoneOrEmail"
              required
              className="mt-1.5 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-white outline-none transition focus:border-hagor-gold"
              placeholder={t("trackContactPlaceholder")}
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={pending} className="hagor-btn w-full disabled:opacity-60">
            {pending ? t("trackChecking") : t("trackSubmit")}
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
