"use client";

import Link from "next/link";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AdminDashboardClient({
  totals,
  recent,
  chart,
  lowStock,
  quick,
}: {
  totals: {
    ordersCount: number;
    revenuePaid: number;
    customersCount: number;
    productsCount: number;
    membersCount: number;
    monthlyGrowthPct: number | null;
    failedPaymentsCount: number;
  };
  chart: { date: string; revenue: number; orders: number }[];
  lowStock: { id: string; name_he: string; name_ar: string; name_en: string; stock: number; sku: string }[];
  recent: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
  quick: {
    addProductHref: string;
    addCategoryHref: string;
    addBannerHref: string;
  };
}) {
  const { t } = useAdminI18n();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("dashboard")}</h1>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          [t("orders"), totals.ordersCount],
          [t("total"), `₪${totals.revenuePaid.toFixed(2)}`],
          [t("customer"), totals.customersCount],
          [t("products"), totals.productsCount],
          ["Membership Members", totals.membersCount],
          ["Monthly Growth", totals.monthlyGrowthPct == null ? "—" : `${totals.monthlyGrowthPct > 0 ? "+" : ""}${totals.monthlyGrowthPct}%`],
          ["Failed payments", totals.failedPaymentsCount],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Sales (last 14 days)</h2>
              <p className="mt-0.5 text-xs text-slate-500">Revenue and order volume.</p>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickFormatter={(v) => `₪${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  formatter={(val: unknown, name: unknown) =>
                    name === "revenue" ? [`₪${String(val)}`, "Revenue"] : [String(val), "Orders"]
                  }
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Low Stock</h2>
          <p className="mt-0.5 text-xs text-slate-500">Products under threshold.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-right text-xs uppercase text-slate-500">
                  <th className="py-2">SKU</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs text-slate-600">{p.sku}</td>
                    <td className="py-2 text-slate-800">{p.name_he}</td>
                    <td className="py-2 tabular-nums text-amber-700 font-semibold">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lowStock.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">All good.</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">{t("orders")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs uppercase text-slate-500">
                <th className="py-2">{t("order")}</th>
                <th className="py-2">{t("customer")}</th>
                <th className="py-2">{t("total")}</th>
                <th className="py-2">{t("status")}</th>
                <th className="py-2">{t("payment")}</th>
                <th className="py-2">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="py-2 font-mono font-medium">{o.orderNumber}</td>
                  <td className="py-2">{o.customerName}</td>
                  <td className="py-2 tabular-nums">₪{o.total.toFixed(2)}</td>
                  <td className="py-2">{o.status}</td>
                  <td className="py-2">{o.paymentStatus}</td>
                  <td className="py-2 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{t("noOrders")}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-800">{t("quickActions")}</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={quick.addProductHref} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {t("addProduct")}
          </Link>
          <Link href={quick.addCategoryHref} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            {t("addMainCategory")}
          </Link>
          <Link href={quick.addBannerHref} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            {t("addBanner")}
          </Link>
        </div>
      </div>
    </div>
  );
}

