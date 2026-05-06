"use client";

import Link from "next/link";
import { useAdminI18n } from "@/lib/admin-i18n";

export function AdminDashboardClient({
  totals,
  recent,
  quick,
}: {
  totals: {
    ordersCount: number;
    revenuePaid: number;
    customersCount: number;
    productsCount: number;
  };
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

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t("orders"), totals.ordersCount],
          [t("total"), `₪${totals.revenuePaid.toFixed(2)}`],
          [t("customer"), totals.customersCount],
          [t("products"), totals.productsCount],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="py-2 font-mono font-medium">{o.orderNumber}</td>
                  <td className="py-2">{o.customerName}</td>
                  <td className="py-2 tabular-nums">₪{o.total.toFixed(2)}</td>
                  <td className="py-2">{o.status}</td>
                  <td className="py-2">{o.paymentStatus}</td>
                  <td className="py-2 text-xs whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleString("he-IL")}
                  </td>
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

