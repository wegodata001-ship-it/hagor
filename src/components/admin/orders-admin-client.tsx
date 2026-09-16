"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { AssetImg } from "@/components/asset-img";
import { useAdminI18n } from "@/lib/admin-i18n";
import { formatSelectedOptionsLines, parseSelectedOptions } from "@/lib/hagour-product-options";
import {
  deleteOrderItemImage,
  getAdminOrderDetail,
  resendCustomerConfirmationEmail,
  updateOrderStatus,
  type AdminOrderDetailDTO,
} from "@/app/admin/actions";

export type OrderRowDTO = {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  deliveryOptionName: string;
  deliveryOptionType: string;
  deliveryPrice: number;
};

export type OrderFilters = {
  q: string;
  status: string;
  paymentStatus: string;
  deliveryType: string;
  shippingArea: string;
  from: string;
  to: string;
  minTotal: string;
  maxTotal: string;
};

const ORDER_STATUS_OPTIONS = ["ALL", "PENDING", "PAID", "CANCELLED", "FAILED"];
const PAYMENT_STATUS_OPTIONS = ["ALL", "UNPAID", "PAID", "TEST_PAID", "DEMO_PAID", "REFUNDED", "FAILED"];
const DELIVERY_TYPE_OPTIONS = ["ALL", "PICKUP", "SHIPPING"];

const fieldClass =
  "h-10 w-full rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#c89211] focus:bg-white focus:ring-2 focus:ring-[#c89211]/15";

function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useAdminI18n();
  if (status === "TEST_PAID") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
        {t("testPaymentBadge")}
      </span>
    );
  }
  if (status === "DEMO_PAID") {
    return (
      <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
        {t("demoPaymentBadge")}
      </span>
    );
  }
  if (status === "PAID") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
        {t("badgePaid")}
      </span>
    );
  }
  if (status === "UNPAID") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
        {t("badgeUnpaid")}
      </span>
    );
  }
  if (status === "REFUNDED") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
        {t("badgeRefunded")}
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
        {t("badgeFailed")}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
      {t("badgePending")}
    </span>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useAdminI18n();
  if (status === "PAID") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
        {t("badgePaid")}
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
        {t("badgeCancelled")}
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
        {t("badgeFailed")}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#FFF8E8] px-2.5 py-0.5 text-[11px] font-semibold text-[#8A6A12]">
      {t("badgePending")}
    </span>
  );
}

function DeliveryCell({ o }: { o: OrderRowDTO }) {
  const { t } = useAdminI18n();
  if (o.deliveryOptionType === "PICKUP") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-[#374151]">
        <PickupIcon />
        {t("pickupSelf")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#374151]">
      <TruckIcon />
      <span className="truncate">
        {o.deliveryOptionName || t("shippingLabel")}
        {o.deliveryPrice > 0 ? ` · ₪${o.deliveryPrice.toFixed(2)}` : ""}
      </span>
    </span>
  );
}

function PickupIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h3.75m0 0V6.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v6.75m-12 0h12" />
    </svg>
  );
}

function RowActions({ onOpen }: { onOpen: () => void }) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={t("actions")}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
      >
        <span className="text-lg leading-none">⋯</span>
      </button>
      {open ? (
        <div className="absolute end-0 z-20 mt-1 min-w-[140px] rounded-xl border border-[#E8E8E8] bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-start text-[13px] text-[#111827] hover:bg-[#F7F8FA]"
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
          >
            {t("viewOrderDetails")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function OrdersAdminClient({
  orders,
  initialFilters,
  shippingAreas,
}: {
  orders: OrderRowDTO[];
  initialFilters: OrderFilters;
  shippingAreas: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [resendingEmail, setResendingEmail] = useState(false);
  const { t, lang } = useAdminI18n();

  const summary = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter((o) =>
      ["PAID", "TEST_PAID", "DEMO_PAID"].includes(o.paymentStatus),
    ).length;
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
    const pendingCount = orders.filter(
      (o) => o.status === "PENDING" || o.paymentStatus === "UNPAID",
    ).length;
    return { total, paid, pending: pendingCount, cancelled };
  }, [orders]);

  const refresh = () => startTransition(() => router.refresh());

  async function openDetail(id: string) {
    setDetailId(id);
    setLoadingDetail(true);
    const d = await getAdminOrderDetail(id);
    setDetail(d);
    setLoadingDetail(false);
  }

  async function saveStatus(form: HTMLFormElement) {
    const fd = new FormData(form);
    const res = await updateOrderStatus(fd);
    if (!res.ok) setToast({ message: res.error, error: true });
    else {
      setToast({ message: t("savedSuccessfully") });
      refresh();
      if (detailId) await openDetail(detailId);
    }
  }

  /**
   * Admin manual resend of the customer's order-confirmation email + PDF.
   * Prompts once for confirmation to prevent accidental double-sends
   * (per the "לבקש confirmation" requirement).
   */
  async function handleResendConfirmationEmail() {
    if (!detail || resendingEmail) return;
    if (!window.confirm(t("resendConfirmationConfirm"))) return;
    setResendingEmail(true);
    try {
      const res = await resendCustomerConfirmationEmail(detail.id);
      if (!res.ok) {
        setToast({ message: res.error, error: true });
        return;
      }
      setToast({ message: t("resendConfirmationOk") });
      // Refresh the detail so the block shows the new "sent at" timestamp.
      if (detailId) await openDetail(detailId);
    } catch {
      setToast({ message: t("resendConfirmationFail"), error: true });
    } finally {
      setResendingEmail(false);
    }
  }

  async function handleDeleteItemImage(itemId: string) {
    if (!detail || deletingImageId) return;
    if (!window.confirm(t("deleteOrderImageConfirm"))) return;
    setDeletingImageId(itemId);
    try {
      const res = await deleteOrderItemImage(detail.id, itemId);
      if (!res.ok) {
        setToast({ message: t("deleteOrderImageError"), error: true });
        return;
      }
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === itemId ? { ...item, productImage: null } : item,
              ),
            }
          : prev,
      );
      setToast({ message: t("deleteOrderImageSuccess") });
    } catch {
      setToast({ message: t("deleteOrderImageError"), error: true });
    } finally {
      setDeletingImageId(null);
    }
  }

  function setFilter<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.status !== "ALL") params.set("status", filters.status);
    if (filters.paymentStatus !== "ALL") params.set("paymentStatus", filters.paymentStatus);
    if (filters.deliveryType !== "ALL") params.set("deliveryType", filters.deliveryType);
    if (filters.shippingArea !== "ALL") params.set("shippingArea", filters.shippingArea);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.minTotal.trim()) params.set("minTotal", filters.minTotal.trim());
    if (filters.maxTotal.trim()) params.set("maxTotal", filters.maxTotal.trim());
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => router.replace(next));
  }

  function clearFilters() {
    const cleared: OrderFilters = {
      q: "",
      status: "ALL",
      paymentStatus: "ALL",
      deliveryType: "ALL",
      shippingArea: "ALL",
      from: "",
      to: "",
      minTotal: "",
      maxTotal: "",
    };
    setFilters(cleared);
    startTransition(() => router.replace(pathname));
  }

  const dateLocale = lang === "en" ? "en-GB" : lang === "ar" ? "ar" : "he-IL";

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            toast.error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#111827] sm:text-[28px]">{t("orders")}</h1>
        <p className="mt-1 text-[13px] text-[#6B7280]">{t("ordersSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t("ordersSummaryTotal"), value: summary.total },
          { label: t("ordersSummaryPaid"), value: summary.paid },
          { label: t("ordersSummaryPending"), value: summary.pending },
          { label: t("ordersSummaryCancelled"), value: summary.cancelled },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#E8E8E8] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
          >
            <p className="text-[12px] font-medium text-[#6B7280]">{card.label}</p>
            <p className="mt-1 text-[22px] font-bold tabular-nums text-[#111827]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E8E8E8] bg-white p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder={t("searchOrdersPlaceholder")}
            className={`${fieldClass} lg:col-span-1`}
          />
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className={fieldClass}>
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? t("allOrderStatuses") : s}
              </option>
            ))}
          </select>
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilter("paymentStatus", e.target.value)}
            className={fieldClass}
          >
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? t("allPaymentStatuses") : s}
              </option>
            ))}
          </select>
          <select
            value={filters.deliveryType}
            onChange={(e) => setFilter("deliveryType", e.target.value)}
            className={fieldClass}
          >
            {DELIVERY_TYPE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v === "ALL" ? t("allDeliveryTypes") : v === "PICKUP" ? t("pickupSelf") : t("shippingLabel")}
              </option>
            ))}
          </select>
          <select
            value={filters.shippingArea}
            onChange={(e) => setFilter("shippingArea", e.target.value)}
            className={fieldClass}
          >
            <option value="ALL">{t("allAreas")}</option>
            {shippingAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilter("from", e.target.value)}
            className={fieldClass}
            aria-label={t("fromDate")}
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilter("to", e.target.value)}
            className={fieldClass}
            aria-label={t("toDate")}
          />
          <input
            type="number"
            value={filters.minTotal}
            onChange={(e) => setFilter("minTotal", e.target.value)}
            placeholder={t("minTotal")}
            className={fieldClass}
          />
          <input
            type="number"
            value={filters.maxTotal}
            onChange={(e) => setFilter("maxTotal", e.target.value)}
            placeholder={t("maxTotal")}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={applyFilters}
            className="h-10 rounded-lg bg-[#111827] px-4 text-[13px] font-semibold text-white transition hover:bg-[#1f2937]"
          >
            {t("filterApply")}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="h-10 rounded-lg border border-[#E8E8E8] bg-white px-4 text-[13px] font-medium text-[#374151] transition hover:bg-[#F7F8FA]"
          >
            {t("clearFilters")}
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-start text-[13px]">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#F8F7F4] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                <th className="px-4 py-3 font-semibold">{t("orderNumber")}</th>
                <th className="px-4 py-3 font-semibold">{t("customer")}</th>
                <th className="px-4 py-3 font-semibold">{t("deliveryTitle")}</th>
                <th className="px-4 py-3 font-semibold">{t("total")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
                <th className="px-4 py-3 font-semibold">{t("payment")}</th>
                <th className="px-4 py-3 font-semibold">{t("date")}</th>
                <th className="px-3 py-3 font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#6B7280]">
                    {t("noOrders")}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-b border-[#F1F1F1] transition hover:bg-[#FAFAFA]"
                    onClick={() => void openDetail(o.id)}
                  >
                    <td className="h-[54px] px-4 font-bold text-[#111827]">{o.orderNumber}</td>
                    <td className="px-4 font-medium text-[#374151]">{o.customerName}</td>
                    <td className="max-w-[180px] px-4">
                      <DeliveryCell o={o} />
                    </td>
                    <td className="px-4 font-bold tabular-nums text-[#111827]">₪{o.total.toFixed(2)}</td>
                    <td className="px-4">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4">
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </td>
                    <td className="px-4 whitespace-nowrap text-[12px] text-[#6B7280]">
                      {new Date(o.createdAt).toLocaleString(dateLocale)}
                    </td>
                    <td className="px-3">
                      <RowActions onOpen={() => void openDetail(o.id)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#E8E8E8] px-4 py-3 text-[12px] text-[#6B7280]">
          <span>{t("showingOrders").replace("{count}", String(orders.length))}</span>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-[#E8E8E8] bg-white px-4 py-10 text-center text-[13px] text-[#6B7280]">
            {t("noOrders")}
          </div>
        ) : (
          orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => void openDetail(o.id)}
              className="block w-full rounded-2xl border border-[#E8E8E8] bg-white p-4 text-start shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#111827]">{o.orderNumber}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[#374151]">{o.customerName}</p>
                </div>
                <p className="font-bold tabular-nums text-[#111827]">₪{o.total.toFixed(2)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={o.status} />
                <PaymentStatusBadge status={o.paymentStatus} />
              </div>
              <p className="mt-2 text-[12px] text-[#6B7280]">{new Date(o.createdAt).toLocaleString(dateLocale)}</p>
            </button>
          ))
        )}
        <p className="px-1 text-[12px] text-[#6B7280]">
          {t("showingOrders").replace("{count}", String(orders.length))}
        </p>
      </div>

      {pending && (
        <div className="fixed bottom-6 start-6 z-[90] rounded-lg bg-[#111827] px-3 py-2 text-white">
          <AdminSpinner className="h-4 w-4 border-t-white" />
        </div>
      )}

      <AdminModal
        open={!!detailId}
        onClose={() => {
          setDetailId(null);
          setDetail(null);
        }}
        title={t("orderDetail")}
        size="xl"
      >
        {loadingDetail && (
          <div className="flex justify-center py-8">
            <AdminSpinner className="h-8 w-8 border-t-[#c89211]" />
          </div>
        )}
        {!loadingDetail && detail && (
          <div className="space-y-4 text-sm">
            {toast && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  toast.error
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {toast.message}
              </div>
            )}
            <div className="flex flex-wrap gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-slate-500">{t("orderLabel")}:</span>{" "}
                <span className="font-mono font-semibold">{detail.orderNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">{t("date")}:</span>{" "}
                {new Date(detail.createdAt).toLocaleString(dateLocale)}
              </div>
            </div>

            {detail.requiresPaymentReconciliation ||
            detail.paymentAttempts.some((a) => a.needsReconciliation) ||
            (detail.notes || "").includes("REQUIRES_RECONCILIATION") ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <p className="font-semibold">נדרש אימות תשלום</p>
                <p className="mt-1 text-xs">
                  ההזמנה מסומנת כ־REQUIRES_RECONCILIATION. סטטוס התשלום נשאר UNPAID עד אימות רשמי מול Hyp
                  (TransId + VERIFY). אין לסמן PAID ידנית לפי הצהרת לקוח בלבד.
                </p>
              </div>
            ) : null}

            <form
              className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveStatus(e.currentTarget);
              }}
            >
              <input type="hidden" name="id" value={detail.id} />
              <label className="text-xs">
                {t("status")}
                <select name="status" defaultValue={detail.status} className="mt-1 block rounded border px-2 py-1 text-sm">
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </label>
              <label className="text-xs">
                {t("payment")}
                <select
                  name="paymentStatus"
                  defaultValue={detail.paymentStatus}
                  className="mt-1 block rounded border px-2 py-1 text-sm"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PAID">PAID</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </label>
              <label className="text-xs">
                מעקב / שליחה
                <select
                  name="fulfillmentStatus"
                  defaultValue={detail.fulfillmentStatus}
                  className="mt-1 block rounded border px-2 py-1 text-sm"
                >
                  <option value="RECEIVED">RECEIVED — הזמנה התקבלה</option>
                  <option value="PROCESSING">PROCESSING — בטיפול</option>
                  <option value="PACKED">PACKED — מוכנה למשלוח</option>
                  <option value="SHIPPED">SHIPPED — נשלחה</option>
                  <option value="COMPLETED">COMPLETED — נמסרה</option>
                </select>
              </label>
              <label className="text-xs">
                מספר מעקב
                <input
                  name="trackingNumber"
                  defaultValue={detail.trackingNumber ?? ""}
                  className="mt-1 block w-36 rounded border px-2 py-1 font-mono text-sm"
                  dir="ltr"
                />
              </label>
              <label className="text-xs">
                חברת משלוחים
                <input
                  name="courierName"
                  defaultValue={detail.courierName ?? ""}
                  className="mt-1 block w-32 rounded border px-2 py-1 text-sm"
                />
              </label>
              <button type="submit" className="rounded bg-[#111827] px-3 py-1.5 text-xs text-white">
                {t("update")}
              </button>
            </form>

            <div>
              <h3 className="font-semibold text-slate-800">{t("customerTitle")}</h3>
              <p>{detail.customerName}</p>
              <p className="font-mono text-xs">{detail.customerEmail}</p>
              <p>{detail.customerPhone}</p>
              {detail.customerProfile && (
                <p className="text-xs text-slate-600">
                  {t("points")}: {detail.customerProfile.pointsBalance}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-slate-800">{t("deliveryTitle")}</h3>
              <p>
                {detail.deliveryOptionName} ({detail.deliveryOptionType}) — ₪{detail.deliveryPrice.toFixed(2)}
              </p>
              {detail.address && <p className="text-xs">{detail.address}</p>}
              {detail.notes && <p className="text-xs text-slate-600">{detail.notes}</p>}
            </div>

            <div>
              <h3 className="font-semibold text-slate-800">{t("items")}</h3>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i.id} className="border-b border-slate-100 align-top">
                      <td className="py-2">
                        <div className="flex items-start gap-2">
                          {i.productImage ? (
                            <div className="flex shrink-0 items-start gap-0.5">
                              <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200">
                                <AssetImg path={i.productImage} alt="" className="h-full w-full object-cover" />
                              </div>
                              <button
                                type="button"
                                title={t("deleteOrderImage")}
                                aria-label={t("deleteOrderImage")}
                                disabled={deletingImageId === i.id}
                                onClick={() => void handleDeleteItemImage(i.id)}
                                className="rounded p-0.5 text-slate-400 transition-colors hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
                              >
                                {deletingImageId === i.id ? (
                                  <AdminSpinner className="h-3.5 w-3.5 border-t-slate-500" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : null}
                          <div>
                            <div>{i.productName}</div>
                            {parseSelectedOptions(i.selectedOptions)?.type ? (
                              <div className="mt-1 text-[11px] text-slate-500">
                                <div className="font-medium">אפשרויות שנבחרו:</div>
                                {formatSelectedOptionsLines(parseSelectedOptions(i.selectedOptions), "he").map(
                                  (line) => (
                                    <div key={line}>{line}</div>
                                  ),
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-center">×{i.quantity}</td>
                      <td className="py-2 text-end tabular-nums">₪{i.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800">{t("payment")}</h3>
              <ul className="mt-1 space-y-2 text-sm">
                {detail.payments.length === 0 ? (
                  <li className="text-xs text-slate-500">—</li>
                ) : (
                  detail.payments.map((p) => (
                    <li key={p.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                      <div>
                        <span className="font-medium">Payment Provider:</span>{" "}
                        {p.provider === "HYP" || p.provider === "hyp" ? "Hyp" : p.provider}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {p.status}
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span> {p.currency} {p.amount.toFixed(2)}
                      </div>
                      {p.transactionId ? (
                        <div className="font-mono text-xs">
                          <span className="font-sans font-medium">Transaction ID:</span> {p.transactionId}
                        </div>
                      ) : null}
                      {p.confirmationNumber ? (
                        <div className="font-mono text-xs">
                          <span className="font-sans font-medium">Auth:</span> {p.confirmationNumber}
                        </div>
                      ) : null}
                      <div className="text-xs text-slate-500">
                        Paid At: {new Date(p.createdAt).toLocaleString(dateLocale)}
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <h4 className="mt-4 font-semibold text-slate-800">Payment attempts (Hyp)</h4>
              <ul className="mt-1 space-y-2 text-sm">
                {(detail.paymentAttempts ?? []).length === 0 ? (
                  <li className="text-xs text-slate-500">אין ניסיון תשלום שמור</li>
                ) : (
                  (detail.paymentAttempts ?? []).map((a) => (
                    <li key={a.id} className="rounded border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <span className="font-medium">Attempt status:</span> {a.status}
                        {a.needsReconciliation ? (
                          <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            נדרש אימות תשלום
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span> {a.currency} {a.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Started: {new Date(a.createdAt).toLocaleString(dateLocale)}
                      </div>
                      {a.successUrl ? (
                        <div className="truncate font-mono text-[10px] text-slate-500" dir="ltr">
                          successUrl: {a.successUrl}
                        </div>
                      ) : null}
                      {a.transactionId || a.providerReference ? (
                        <div className="font-mono text-xs">TransId: {a.transactionId || a.providerReference}</div>
                      ) : null}
                      {a.lastError ? <div className="text-xs text-slate-600">lastError: {a.lastError}</div> : null}
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500">
                אין כפתור &quot;סמן כשולם&quot; שעוקף אימות Hyp. לאחר קבלת TransId אמין — יש לאמת רשמית לפני PAID.
              </p>
            </div>

            {/* Customer confirmation email — read-only status + manual retry. */}
            <CustomerConfirmationBlock
              detail={detail}
              t={t}
              dateLocale={dateLocale}
              onResend={handleResendConfirmationEmail}
              busy={resendingEmail}
            />

            <div className="border-t border-slate-200 pt-3 text-base font-bold">
              {t("total")}: ₪{detail.total.toFixed(2)}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                {t("orderSubtotal")}: ₪{detail.subtotal.toFixed(2)}
              </div>
              {detail.couponCode ? (
                <div>
                  {t("couponCodeLabel")}: <span className="font-mono">{detail.couponCode}</span>
                  {detail.coupon?.typeLabel ? <span> ({detail.coupon.typeLabel})</span> : null}
                </div>
              ) : null}
              <div>
                {t("orderCouponDiscount")}: {detail.discountAmount > 0 ? "−" : ""}₪{detail.discountAmount.toFixed(2)}
              </div>
              <div>
                {t("orderPointsDiscount")}: ₪{detail.pointsDiscountAmount.toFixed(2)}
              </div>
              <div>
                {t("orderDeliveryMethod")}: {detail.deliveryOptionName} ({detail.deliveryOptionType})
              </div>
              <div>
                {t("orderDeliveryPrice")}: ₪{detail.deliveryPrice.toFixed(2)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span>{t("orderPaymentStatus")}:</span>
                <PaymentStatusBadge status={detail.paymentStatus} />
              </div>
              <div className="font-semibold">
                {t("orderFinalTotal")}: ₪{detail.total.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

/**
 * "Customer confirmation" panel inside the order detail modal. Shows the
 * last known send state (recipient / provider / message id / timestamp)
 * and a retry button. Read-only view — the mutation goes through the
 * `resendCustomerConfirmationEmail` server action.
 */
function CustomerConfirmationBlock({
  detail,
  t,
  dateLocale,
  onResend,
  busy,
}: {
  detail: AdminOrderDetailDTO;
  t: (k: string) => string;
  dateLocale: string;
  onResend: () => void;
  busy: boolean;
}) {
  const email = detail.customerConfirmationEmail;
  const noCustomerEmail = !detail.customerEmail?.trim();
  const paid =
    (detail.paymentStatus === "PAID" ||
      detail.paymentStatus === "TEST_PAID" ||
      detail.paymentStatus === "DEMO_PAID") &&
    detail.status === "PAID";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800">{t("customerConfirmationTitle")}</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Field label={t("customerConfirmationRecipient")}>
          {noCustomerEmail ? (
            <span className="text-slate-400">{t("customerConfirmationNoEmail")}</span>
          ) : (
            <span className="font-mono text-[12px] text-slate-900">
              {email.recipient ?? detail.customerEmail}
            </span>
          )}
        </Field>
        <Field label={t("customerConfirmationPdf")}>
          <span className="font-mono text-[12px] text-slate-900">
            {email.filename ?? `HAGOUR-ORDER-${detail.orderNumber}.pdf`}
          </span>
        </Field>
        <Field label={t("customerConfirmationStatus")}>
          {email.sent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
              <span aria-hidden>✓</span>
              {t("customerConfirmationStatusSent")}
            </span>
          ) : email.lastError ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">
              <span aria-hidden>⚠</span>
              {t("customerConfirmationStatusFailed")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
              {t("customerConfirmationStatusPending")}
            </span>
          )}
        </Field>
        <Field label={t("customerConfirmationDate")}>
          {email.lastSentAt ? (
            new Date(email.lastSentAt).toLocaleString(dateLocale)
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </Field>
        {email.provider ? (
          <Field label={t("customerConfirmationProvider")}>
            <span className="font-mono text-[11px] text-slate-700">
              {email.provider}
              {email.messageId ? ` · ${email.messageId}` : ""}
            </span>
          </Field>
        ) : null}
      </div>
      {email.lastError ? (
        <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
          {email.lastError}
          {email.lastErrorAt ? (
            <span className="ms-2 text-rose-700/70">
              ({new Date(email.lastErrorAt).toLocaleString(dateLocale)})
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onResend}
          disabled={busy || noCustomerEmail || !paid}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t("customerConfirmationSending") : t("customerConfirmationResend")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900">{children}</div>
    </div>
  );
}
