"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  getAdminOrderDetail,
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
const PAYMENT_STATUS_OPTIONS = ["ALL", "UNPAID", "PAID", "REFUNDED", "FAILED"];
const DELIVERY_TYPE_OPTIONS = ["ALL", "PICKUP", "SHIPPING"];

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
  const [toast, setToast] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const { t } = useAdminI18n();

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
    if (!res.ok) setToast(res.error);
    else {
      setToast(t("savedSuccessfully"));
      refresh();
      if (detailId) await openDetail(detailId);
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

  const deliveryLabel = (o: OrderRowDTO) =>
    o.deliveryOptionType === "PICKUP"
      ? "איסוף עצמי"
      : `${o.deliveryOptionName} - ₪${o.deliveryPrice.toFixed(2)}`;

  return (
    <div>
      {toast && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">{toast}</div>}
      <h1 className="text-xl font-semibold text-slate-900">{t("orders")}</h1>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="חיפוש: מספר הזמנה / שם / טלפון / אימייל"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <select
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All order statuses" : s}
              </option>
            ))}
          </select>

          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilter("paymentStatus", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All payment statuses" : s}
              </option>
            ))}
          </select>

          <select
            value={filters.deliveryType}
            onChange={(e) => setFilter("deliveryType", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {DELIVERY_TYPE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v === "ALL" ? "All delivery types" : v === "PICKUP" ? "Pickup from store" : "Shipping"}
              </option>
            ))}
          </select>

          <select
            value={filters.shippingArea}
            onChange={(e) => setFilter("shippingArea", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All areas</option>
            {shippingAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilter("from", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilter("to", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={filters.minTotal}
            onChange={(e) => setFilter("minTotal", e.target.value)}
            placeholder="Min total"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={filters.maxTotal}
            onChange={(e) => setFilter("maxTotal", e.target.value)}
            placeholder="Max total"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">{t("orderNumber")}</th>
              <th className="px-4 py-3">{t("customer")}</th>
              <th className="px-4 py-3">{t("deliveryTitle")}</th>
              <th className="px-4 py-3">{t("total")}</th>
              <th className="px-4 py-3">{t("status")}</th>
              <th className="px-4 py-3">{t("payment")}</th>
              <th className="px-4 py-3">{t("date")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                onClick={() => void openDetail(o.id)}
              >
                <td className="px-4 py-2 font-mono font-semibold">{o.orderNumber}</td>
                <td className="px-4 py-2">{o.customerName}</td>
                <td className="px-4 py-2">{deliveryLabel(o)}</td>
                <td className="px-4 py-2 tabular-nums">₪{o.total.toFixed(2)}</td>
                <td className="px-4 py-2">{o.status}</td>
                <td className="px-4 py-2">{o.paymentStatus}</td>
                <td className="px-4 py-2 text-xs">{new Date(o.createdAt).toLocaleString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending && (
        <div className="fixed bottom-6 left-6 z-[90] rounded-lg bg-slate-900 px-3 py-2 text-white">
          <AdminSpinner className="h-4 w-4 border-t-white" />
        </div>
      )}

      <AdminModal open={!!detailId} onClose={() => { setDetailId(null); setDetail(null); }} title={t("orderDetail")} size="xl">
        {loadingDetail && (
          <div className="flex justify-center py-8">
            <AdminSpinner className="h-8 w-8 border-t-blue-600" />
          </div>
        )}
        {!loadingDetail && detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-slate-500">{t("orderLabel")}:</span>{" "}
                <span className="font-mono font-semibold">{detail.orderNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">{t("date")}:</span>{" "}
                {new Date(detail.createdAt).toLocaleString("he-IL")}
              </div>
            </div>

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
                <select name="paymentStatus" defaultValue={detail.paymentStatus} className="mt-1 block rounded border px-2 py-1 text-sm">
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
                  <option value="RECEIVED">RECEIVED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="PACKED">PACKED</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </label>
              <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white">
                {t("update")}
              </button>
            </form>

            <div>
              <h3 className="font-semibold text-slate-800">{t("customerTitle")}</h3>
              <p>{detail.customerName}</p>
              <p className="font-mono text-xs">{detail.customerEmail}</p>
              <p>{detail.customerPhone}</p>
              {detail.customerProfile && (
                <p className="text-xs text-slate-600">{t("points")}: {detail.customerProfile.pointsBalance}</p>
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
                    <tr key={i.id} className="border-b border-slate-100">
                      <td className="py-1">{i.productName}</td>
                      <td className="py-1 text-center">×{i.quantity}</td>
                      <td className="py-1 text-end tabular-nums">₪{i.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800">{t("payment")}</h3>
              <ul className="mt-1 space-y-1 font-mono text-xs">
                {detail.payments.map((p) => (
                  <li key={p.id}>
                    {p.provider} · {p.status} · {p.currency} {p.amount.toFixed(2)}
                    {p.transactionId ? ` · ${p.transactionId}` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-200 pt-3 text-base font-bold">
              {t("total")}: ₪{detail.total.toFixed(2)}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>{t("orderSubtotal")}: ₪{detail.subtotal.toFixed(2)}</div>
              <div>{t("orderCouponDiscount")}: ₪{detail.discountAmount.toFixed(2)}</div>
              <div>{t("orderPointsDiscount")}: ₪{detail.pointsDiscountAmount.toFixed(2)}</div>
              <div>{t("orderDeliveryMethod")}: {detail.deliveryOptionName} ({detail.deliveryOptionType})</div>
              <div>{t("orderDeliveryPrice")}: ₪{detail.deliveryPrice.toFixed(2)}</div>
              <div>{t("orderPaymentStatus")}: {detail.paymentStatus}</div>
              <div className="font-semibold">{t("orderFinalTotal")}: ₪{detail.total.toFixed(2)}</div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
