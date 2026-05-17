"use client";

import type { ObservabilityDashboardData } from "@/lib/observability/aggregate";
import { useAdminI18n } from "@/lib/admin-i18n";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Table({
  title,
  columns,
  rows,
  empty,
}: {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  {row.map((cell, j) => (
                    <td key={j} className="max-w-[28rem] truncate px-4 py-2.5 text-slate-800">
                      {cell ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ObservabilityAdminClient({ data }: { data: ObservabilityDashboardData | null }) {
  const { t } = useAdminI18n();

  if (!data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="font-medium">{t("observabilityLoadError")}</p>
        <p className="mt-2 text-sm text-amber-900/90">{t("observabilityEnsureDb")}</p>
      </div>
    );
  }

  const s = data.summary24h;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("observabilityTitle")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("observabilitySubtitle")}</p>
        <p className="mt-2 font-mono text-xs text-slate-400">
          {t("observabilityWindow")}: {data.since24h} → now · storeId={data.storeId}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label={t("obsErrors24h")} value={s.errors} />
        <StatCard label={t("obsWarns24h")} value={s.warns} />
        <StatCard label={t("obsTimeouts24h")} value={s.timeouts} />
        <StatCard label={t("obsSlowSafeQueries24h")} value={s.slowSafeQueries} />
        <StatCard label={t("obsPrismaSlow24h")} value={s.prismaSlow} />
        <StatCard label={t("obsPrismaFailures24h")} value={s.prismaFailures} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label={t("obsAuthAvg")}
          value={s.authAvgMs != null ? `${s.authAvgMs} ms` : "—"}
          sub={`${t("obsSamples")}: ${s.authSamples}`}
        />
        <StatCard label={t("obsAuthP50")} value={s.authP50Ms != null ? `${s.authP50Ms} ms` : "—"} />
        <StatCard label={t("obsAuthP95")} value={s.authP95Ms != null ? `${s.authP95Ms} ms` : "—"} />
      </div>

      <Table
        title={t("obsGroupedErrors")}
        columns={[t("obsColMessage"), t("obsColQuery"), t("obsColPath"), t("obsColCount")]}
        rows={data.groupedErrors.map((r) => [r.message, r.queryKey, r.path, r.count])}
        empty={t("obsNoData")}
      />

      <Table
        title={t("obsSlowSafeQueries")}
        columns={[t("obsColQuery"), t("obsColPath"), t("obsColCount"), "max ms", "avg ms"]}
        rows={data.slowSafeQueries.map((r) => [r.queryKey, r.path, r.count, r.maxMs, r.avgMs])}
        empty={t("obsNoData")}
      />

      <Table
        title={t("obsTimeoutAnalytics")}
        columns={[t("obsColQuery"), t("obsColPath"), t("obsColCount")]}
        rows={data.timeouts.map((r) => [r.queryKey, r.path, r.count])}
        empty={t("obsNoTimeouts")}
      />

      <Table
        title={t("obsTopFailingRoutes")}
        columns={[t("obsColPath"), t("obsColCount")]}
        rows={data.topFailingRoutes.map((r) => [r.path, r.count])}
        empty={t("obsNoData")}
      />

      <Table
        title={t("obsPrismaSlow")}
        columns={[t("obsColModelOp"), t("obsColCount"), "max ms", "avg ms"]}
        rows={data.prismaSlow.map((r) => [r.queryKey, r.count, r.maxMs, r.avgMs])}
        empty={t("obsNoData")}
      />

      <Table
        title={t("obsPrismaFailures")}
        columns={[t("obsColModelOp"), t("obsColCount")]}
        rows={data.prismaFailures.map((r) => [r.queryKey, r.count])}
        empty={t("obsNoData")}
      />

      <Table
        title={t("obsRequestTracing")}
        columns={[t("obsColTraceId"), t("obsColEvents")]}
        rows={data.recentTraces.map((r) => [r.traceId, r.events])}
        empty={t("obsNoTraces")}
      />

      <p className="text-xs text-slate-500">
        {t("obsFootnote")}
      </p>
    </div>
  );
}
