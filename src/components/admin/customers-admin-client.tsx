"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pointsBalance: number;
  membershipBadge: string | null;
  membershipPlan: string | null;
  membershipEndsAt: string | null;
  hasExpiredMembership: boolean;
  createdAt: string;
};

function pillClass(kind: "active" | "expired" | "none") {
  if (kind === "active") return "bg-emerald-100 text-emerald-800";
  if (kind === "expired") return "bg-amber-100 text-amber-900";
  return "bg-slate-200 text-slate-700";
}

export function CustomersAdminClient({ rows, filter }: { rows: CustomerRow[]; filter: string }) {
  const { t } = useAdminI18n();
  const totals = useMemo(() => rows.length, [rows.length]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Membership status, points and customer details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/customers"
            className={`rounded-lg border px-3 py-2 text-sm ${filter ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-blue-200 bg-blue-50 text-blue-700"}`}
          >
            All ({totals})
          </Link>
          <Link
            href="/admin/customers?filter=members"
            className={`rounded-lg border px-3 py-2 text-sm ${filter === "members" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            Members
          </Link>
          <Link
            href="/admin/customers?filter=expired"
            className={`rounded-lg border px-3 py-2 text-sm ${filter === "expired" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            Expired
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Membership</th>
              <th className="px-4 py-3">Badge</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const membershipKind = r.membershipPlan ? "active" : r.hasExpiredMembership ? "expired" : "none";
              const ends =
                r.membershipEndsAt && !Number.isNaN(Date.parse(r.membershipEndsAt))
                  ? new Date(r.membershipEndsAt).toLocaleDateString()
                  : null;
              const joined =
                r.createdAt && !Number.isNaN(Date.parse(r.createdAt)) ? new Date(r.createdAt).toLocaleDateString() : "—";
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{r.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{r.email}</div>
                    <div className="text-xs text-slate-500">{r.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.pointsBalance}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${pillClass(membershipKind)}`}>
                      {r.membershipPlan ? r.membershipPlan : r.hasExpiredMembership ? "Expired" : "—"}
                    </span>
                    {ends ? <div className="mt-1 text-xs text-slate-500">Ends: {ends}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{r.membershipBadge ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{joined}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-8 text-center text-slate-500">{t("noData")}</p> : null}
      </div>
    </div>
  );
}

