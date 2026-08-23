"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ObservabilityDashboardData } from "@/lib/observability/aggregate";
import { useAdminI18n } from "@/lib/admin-i18n";
import type { SystemStatusBusinessStats } from "@/lib/system-status-stats";
import { AdminSpinner } from "@/components/admin/admin-spinner";

type OverallTone = "ok" | "warn" | "error" | "unknown";
type ServiceTone = "ok" | "warn" | "error" | "unknown";

function toneDot(tone: ServiceTone) {
  if (tone === "ok") return "bg-emerald-500";
  if (tone === "warn") return "bg-amber-500";
  if (tone === "error") return "bg-red-500";
  return "bg-slate-400";
}

function toneBorder(tone: OverallTone) {
  if (tone === "ok") return "border-emerald-200 bg-emerald-50";
  if (tone === "warn") return "border-amber-200 bg-amber-50";
  if (tone === "error") return "border-red-200 bg-red-50";
  return "border-slate-200 bg-slate-50";
}

function toneText(tone: OverallTone) {
  if (tone === "ok") return "text-emerald-900";
  if (tone === "warn") return "text-amber-950";
  if (tone === "error") return "text-red-950";
  return "text-slate-800";
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function ServiceRow({ label, tone, status }: { label: string; tone: ServiceTone; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <span className="inline-flex items-center gap-2 text-sm text-slate-700">
        <span className={`h-2.5 w-2.5 rounded-full ${toneDot(tone)}`} aria-hidden />
        {status}
      </span>
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">{empty}</p>
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

function mapAlertArea(
  scope: string | null,
  path: string | null,
  message: string,
  t: (k: string) => string,
): string {
  const blob = `${scope ?? ""} ${path ?? ""} ${message}`.toLowerCase();
  if (blob.includes("email") || blob.includes("mail") || blob.includes("smtp")) return t("sysAreaEmail");
  if (blob.includes("payment") || blob.includes("checkout/payment") || blob.includes("webhook")) {
    return t("sysAreaPayments");
  }
  if (blob.includes("order") || blob.includes("checkout") || blob.includes("cart")) {
    return t("sysAreaOrders");
  }
  if (blob.includes("auth") || blob.includes("login") || blob.includes("password")) {
    return t("sysAreaAuth");
  }
  if (blob.includes("prisma") || blob.includes("safe_query") || blob.includes("timeout")) {
    return t("sysAreaDatabase");
  }
  return t("sysAreaSystem");
}

function friendlyAlertDescription(message: string, t: (k: string) => string): string {
  const m = message.toLowerCase();
  if (m.includes("query_timeout") || m.includes("timeout")) return t("sysAlertTimeout");
  if (m.includes("prisma_query_failed") || m.includes("query_failed")) return t("sysAlertDbFailure");
  if (m.includes("query_slow") || m.includes("prisma_query")) return t("sysAlertSlowQuery");
  if (m.includes("email") || m.includes("mail")) return t("sysAlertEmail");
  if (m.includes("payment") || m.includes("webhook")) return t("sysAlertPayment");
  if (m.includes("auth")) return t("sysAlertAuth");
  // Keep short original message without stack-looking noise
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (cleaned.length > 120) return `${cleaned.slice(0, 117)}…`;
  return cleaned || t("sysAlertGeneric");
}

function formatCheckedAt(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    const locale = lang === "ar" ? "ar" : lang === "en" ? "en-GB" : "he-IL";
    const datePart = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    const timePart = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return `${datePart} ${timePart}`;
  } catch {
    return iso;
  }
}

function formatAlertTime(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    const locale = lang === "ar" ? "ar" : lang === "en" ? "en-GB" : "he-IL";
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function ObservabilityAdminClient({
  data,
  business,
  emailConfigured,
  checkedAt,
}: {
  data: ObservabilityDashboardData | null;
  business: SystemStatusBusinessStats | null;
  emailConfigured: boolean;
  checkedAt: string;
}) {
  const { t, lang } = useAdminI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [techOpen, setTechOpen] = useState(false);

  const summary = data?.summary24h;
  const loadFailed = !data || !business;

  const overall = useMemo((): OverallTone => {
    if (loadFailed) return "error";
    if (!summary) return "unknown";
    if (summary.errors > 0 || summary.prismaFailures > 0) return "error";
    if (
      summary.warns > 0 ||
      summary.timeouts > 0 ||
      summary.slowSafeQueries > 0 ||
      summary.prismaSlow > 0 ||
      (business?.failedPayments ?? 0) > 0
    ) {
      return "warn";
    }
    return "ok";
  }, [loadFailed, summary, business?.failedPayments]);

  const responseTone = useMemo((): ServiceTone => {
    const ms = summary?.authAvgMs;
    if (ms == null) return "unknown";
    if (ms < 800) return "ok";
    if (ms < 2000) return "warn";
    return "error";
  }, [summary?.authAvgMs]);

  const responseLabel = useMemo(() => {
    if (responseTone === "ok") return t("sysResponseFast");
    if (responseTone === "warn") return t("sysResponseMedium");
    if (responseTone === "error") return t("sysResponseSlow");
    return t("sysNoData");
  }, [responseTone, t]);

  const dbTone: ServiceTone = loadFailed
    ? "error"
    : summary && (summary.prismaFailures > 0 || summary.timeouts > 0)
      ? "error"
      : summary && (summary.prismaSlow > 0 || summary.slowSafeQueries > 0)
        ? "warn"
        : "ok";

  const emailTone: ServiceTone = emailConfigured ? "ok" : "unknown";
  const ordersTone: ServiceTone =
    summary && summary.errors > 0 ? "warn" : loadFailed ? "error" : "ok";
  const paymentsTone: ServiceTone = !business?.paymentConfigured
    ? "unknown"
    : (business?.failedPayments ?? 0) > 0
      ? "warn"
      : "ok";

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  const overallTitle =
    overall === "ok"
      ? t("sysOverallOk")
      : overall === "warn"
        ? t("sysOverallWarn")
        : overall === "error"
          ? t("sysOverallError")
          : t("sysOverallUnknown");

  const alerts = data?.recentAlerts ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("observabilityTitle")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("observabilitySubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? <AdminSpinner className="h-4 w-4 border-t-white" /> : null}
          {pending ? t("sysChecking") : t("sysCheckNow")}
        </button>
      </div>

      <div className={`rounded-2xl border p-5 shadow-sm ${toneBorder(overall)}`}>
        <div className={`text-lg font-semibold ${toneText(overall)}`}>{overallTitle}</div>
        <p className="mt-2 text-sm text-slate-600">
          {t("sysLastCheck")}: {formatCheckedAt(checkedAt, lang)}
        </p>
      </div>

      {business ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("sysBusinessTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard label={t("sysOrdersToday")} value={business.ordersToday} />
            <MetricCard label={t("sysIncompleteOrders")} value={business.incompleteOrders} />
            <MetricCard label={t("sysFailedPayments")} value={business.failedPayments} />
            <MetricCard label={t("sysOutOfStock")} value={business.outOfStock} />
            <MetricCard label={t("sysLowStock")} value={business.lowStock} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{t("sysBusinessNote")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {t("sysBusinessLoadError")}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("sysServicesTitle")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <ServiceRow label={t("sysServiceSite")} tone="ok" status={t("sysStatusActive")} />
          <ServiceRow
            label={t("sysServiceDatabase")}
            tone={dbTone}
            status={
              dbTone === "ok"
                ? t("sysStatusOk")
                : dbTone === "warn"
                  ? t("sysStatusAttention")
                  : dbTone === "error"
                    ? t("sysStatusFault")
                    : t("sysStatusUnknown")
            }
          />
          <ServiceRow
            label={t("sysServiceEmail")}
            tone={emailTone}
            status={emailConfigured ? t("sysStatusOk") : t("sysStatusNotConfigured")}
          />
          <ServiceRow
            label={t("sysServiceOrders")}
            tone={ordersTone}
            status={
              ordersTone === "ok"
                ? t("sysStatusOk")
                : ordersTone === "warn"
                  ? t("sysStatusAttention")
                  : t("sysStatusFault")
            }
          />
          <ServiceRow
            label={t("sysServicePayments")}
            tone={paymentsTone}
            status={
              paymentsTone === "ok"
                ? t("sysStatusOk")
                : paymentsTone === "warn"
                  ? t("sysStatusAttention")
                  : paymentsTone === "unknown"
                    ? t("sysStatusNotConfigured")
                    : t("sysStatusFault")
            }
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">{t("sysResponseTitle")}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 text-base font-semibold ${toneText(responseTone)}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${toneDot(responseTone)}`} aria-hidden />
            {responseLabel}
          </span>
          <span className="tabular-nums text-slate-600">
            {summary?.authAvgMs != null ? `${summary.authAvgMs}ms` : "—"}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("sysResponseHint")}</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">{t("sysAlertsTitle")}</h2>
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-900">
            {t("sysNoAlerts")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-start text-xs font-semibold text-slate-600">
                      {t("sysColTime")}
                    </th>
                    <th className="px-4 py-2 text-start text-xs font-semibold text-slate-600">
                      {t("sysColType")}
                    </th>
                    <th className="px-4 py-2 text-start text-xs font-semibold text-slate-600">
                      {t("sysColArea")}
                    </th>
                    <th className="px-4 py-2 text-start text-xs font-semibold text-slate-600">
                      {t("sysColDescription")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((a, i) => (
                    <tr key={`${a.createdAt}-${i}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-700">
                        {formatAlertTime(a.createdAt, lang)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {a.level === "error" ? t("sysTypeError") : t("sysTypeWarn")}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {mapAlertArea(a.scope, a.path, a.message, t)}
                      </td>
                      <td className="max-w-md px-4 py-2.5 text-slate-800">
                        {friendlyAlertDescription(a.message, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setTechOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
          aria-expanded={techOpen}
        >
          <span className="text-sm font-semibold text-slate-800">{t("sysTechTitle")}</span>
          <span className="text-xs text-slate-500">{techOpen ? t("sysTechHide") : t("sysTechShow")}</span>
        </button>
        {techOpen && data ? (
          <div className="space-y-4 border-t border-slate-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label={t("observErrors24h")} value={data.summary24h.errors} />
              <MetricCard label={t("observWarns24h")} value={data.summary24h.warns} />
              <MetricCard label={t("observTimeouts24h")} value={data.summary24h.timeouts} />
              <MetricCard label={t("observSlowSafeQueries24h")} value={data.summary24h.slowSafeQueries} />
              <MetricCard label={t("observPrismaSlow24h")} value={data.summary24h.prismaSlow} />
              <MetricCard label={t("observPrismaFailures24h")} value={data.summary24h.prismaFailures} />
              <MetricCard
                label={t("observAuthAvg")}
                value={data.summary24h.authAvgMs != null ? `${data.summary24h.authAvgMs} ms` : "—"}
              />
              <MetricCard
                label={t("observAuthP50")}
                value={data.summary24h.authP50Ms != null ? `${data.summary24h.authP50Ms} ms` : "—"}
              />
              <MetricCard
                label={t("observAuthP95")}
                value={data.summary24h.authP95Ms != null ? `${data.summary24h.authP95Ms} ms` : "—"}
              />
            </div>

            <Table
              title={t("observGroupedErrors")}
              columns={[t("observColMessage"), t("observColQuery"), t("observColPath"), t("observColCount")]}
              rows={data.groupedErrors.map((r) => [r.message, r.queryKey, r.path, r.count])}
              empty={t("observNoData")}
            />
            <Table
              title={t("observSlowSafeQueries")}
              columns={[
                t("observColQuery"),
                t("observColPath"),
                t("observColCount"),
                t("observColMaxMs"),
                t("observColAvgMs"),
              ]}
              rows={data.slowSafeQueries.map((r) => [r.queryKey, r.path, r.count, r.maxMs, r.avgMs])}
              empty={t("observNoData")}
            />
            <Table
              title={t("observTimeoutAnalytics")}
              columns={[t("observColQuery"), t("observColPath"), t("observColCount")]}
              rows={data.timeouts.map((r) => [r.queryKey, r.path, r.count])}
              empty={t("observNoTimeouts")}
            />
            <Table
              title={t("observTopFailingRoutes")}
              columns={[t("observColPath"), t("observColCount")]}
              rows={data.topFailingRoutes.map((r) => [r.path, r.count])}
              empty={t("observNoData")}
            />
            <Table
              title={t("observPrismaSlow")}
              columns={[t("observColModelOp"), t("observColCount"), t("observColMaxMs"), t("observColAvgMs")]}
              rows={data.prismaSlow.map((r) => [r.queryKey, r.count, r.maxMs, r.avgMs])}
              empty={t("observNoData")}
            />
            <Table
              title={t("observPrismaFailures")}
              columns={[t("observColModelOp"), t("observColCount")]}
              rows={data.prismaFailures.map((r) => [r.queryKey, r.count])}
              empty={t("observNoData")}
            />
            <Table
              title={t("observRequestTracing")}
              columns={[t("observColTraceId"), t("observColEvents")]}
              rows={data.recentTraces.map((r) => [r.traceId, r.events])}
              empty={t("observNoTraces")}
            />
            <p className="text-xs text-slate-500">{t("observFootnote")}</p>
          </div>
        ) : null}
        {techOpen && !data ? (
          <div className="border-t border-slate-200 px-5 py-4 text-sm text-amber-900">
            {t("observabilityLoadError")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
