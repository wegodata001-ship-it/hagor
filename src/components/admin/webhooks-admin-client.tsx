"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { isRtl, useAdminI18n } from "@/lib/admin-i18n";
import type { EnrichedWebhookEvent, EventKind, EventMessageKey } from "@/lib/payments/webhook-events";

export type { EnrichedWebhookEvent } from "@/lib/payments/webhook-events";

type Tab = "business" | "technical";
type Range = "today" | "7d" | "30d" | "all";
type StatusFilter = "all" | EventKind;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function rangeStart(range: Range): number {
  const now = Date.now();
  switch (range) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case "7d":
      return now - 7 * ONE_DAY_MS;
    case "30d":
      return now - 30 * ONE_DAY_MS;
    case "all":
      return 0;
  }
}

function formatDateTime(iso: string, lang: string): { date: string; time: string } {
  const d = new Date(iso);
  const localeMap: Record<string, string> = { he: "he-IL", ar: "ar", en: "en-GB" };
  const locale = localeMap[lang] ?? "en-GB";
  return {
    date: d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
  };
}

function formatAmount(v: number | null): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  return `₪${v.toFixed(2)}`;
}

function messageKeyToI18n(k: EventMessageKey): string {
  switch (k) {
    case "success":
      return "paymentActivityMsgSuccess";
    case "duplicate":
      return "paymentActivityMsgDuplicate";
    case "declined_by_acquirer":
      return "paymentActivityMsgDeclined";
    case "needs_review":
      return "paymentActivityMsgNeedsReview";
    case "pending":
      return "paymentActivityMsgPending";
    case "unattributable":
      return "paymentActivityMsgUnattributable";
    case "malformed":
      return "paymentActivityMsgMalformed";
    case "signature_mismatch":
      return "paymentActivityMsgSignatureMismatch";
    case "processing_error":
      return "paymentActivityMsgProcessingError";
    case "ignored":
      return "paymentActivityMsgIgnored";
  }
}

function kindToBadge(kind: EventKind): {
  labelKey: string;
  icon: string;
  className: string;
} {
  switch (kind) {
    case "success":
      return {
        labelKey: "paymentActivityBadgeApproved",
        icon: "✓",
        className: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      };
    case "duplicate":
      return {
        labelKey: "paymentActivityBadgeDuplicate",
        icon: "↻",
        className: "bg-sky-50 text-sky-800 ring-sky-200",
      };
    case "failed_payment":
      return {
        labelKey: "paymentActivityBadgeFailed",
        icon: "✕",
        className: "bg-rose-50 text-rose-800 ring-rose-200",
      };
    case "needs_review":
      return {
        labelKey: "paymentActivityBadgeReview",
        icon: "!",
        className: "bg-amber-50 text-amber-900 ring-amber-200",
      };
    case "pending":
      return {
        labelKey: "paymentActivityBadgePending",
        icon: "⏳",
        className: "bg-slate-100 text-slate-700 ring-slate-200",
      };
    case "unattributable":
      return {
        labelKey: "paymentActivityBadgeUnattributable",
        icon: "◌",
        className: "bg-slate-100 text-slate-600 ring-slate-200",
      };
    case "technical":
      return {
        labelKey: "paymentActivityBadgeTechnical",
        icon: "⚙",
        className: "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

/** Was the customer's money actually captured? Only three answers ever. */
function paymentCapturedAnswer(e: EnrichedWebhookEvent): "yes" | "no" | "unknown" {
  if (e.kind === "success" || e.kind === "duplicate") return "yes";
  if (e.kind === "failed_payment") return "no";
  if (e.order?.paymentStatus === "PAID") return "yes";
  return "unknown";
}

/** Should Wael take an action for this event? */
function requiresAction(e: EnrichedWebhookEvent): boolean {
  return e.kind === "needs_review" || e.kind === "failed_payment";
}

export function WebhooksAdminClient({ events }: { events: EnrichedWebhookEvent[] }) {
  const { t, lang } = useAdminI18n();
  const rtl = isRtl(lang);
  const dir: "rtl" | "ltr" = rtl ? "rtl" : "ltr";

  const [tab, setTab] = useState<Tab>("business");
  const [range, setRange] = useState<Range>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<EnrichedWebhookEvent | null>(null);

  // Summary — computed from the ENTIRE feed, not the filtered view. This
  // way the "12 approved" number doesn't change when the admin types a filter.
  const summary = useMemo(() => {
    let approved = 0;
    let failed = 0;
    let review = 0;
    for (const e of events) {
      if (e.kind === "success" || e.kind === "duplicate") approved += 1;
      else if (e.kind === "failed_payment") failed += 1;
      else if (e.kind === "needs_review") review += 1;
    }
    return { total: events.length, approved, failed, review };
  }, [events]);

  const filtered = useMemo(() => {
    const from = rangeStart(range);
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      if (new Date(e.createdAtISO).getTime() < from) return false;
      if (tab === "business" && !e.businessRelevant) return false;
      if (tab === "technical" && e.businessRelevant) return false;
      if (status !== "all" && e.kind !== status) return false;
      if (needle) {
        const hay = [
          e.order?.orderNumber ?? "",
          e.order?.customerName ?? "",
          e.transactionId ?? "",
          e.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [events, range, status, tab, q]);

  const naLabel = t("paymentActivityNotAvailable");

  return (
    <div dir={dir}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("paymentActivityTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("paymentActivitySubtitle")}</p>
      </div>

      {/* Summary cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label={t("paymentActivitySummaryTotal")} value={summary.total} />
        <SummaryCard
          label={t("paymentActivitySummaryApproved")}
          value={summary.approved}
          tone="ok"
        />
        <SummaryCard
          label={t("paymentActivitySummaryFailed")}
          value={summary.failed}
          tone="fail"
        />
        <SummaryCard
          label={t("paymentActivitySummaryReview")}
          value={summary.review}
          tone="warn"
        />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200">
        <TabButton
          active={tab === "business"}
          onClick={() => setTab("business")}
          label={t("paymentActivityTabBusiness")}
        />
        <TabButton
          active={tab === "technical"}
          onClick={() => setTab("technical")}
          label={t("paymentActivityTabTechnical")}
        />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("paymentActivitySearchPlaceholder")}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400"
          >
            <option value="all">{t("paymentActivityStatusAll")}</option>
            {tab === "business" ? (
              <>
                <option value="success">{t("paymentActivityStatusApproved")}</option>
                <option value="failed_payment">{t("paymentActivityStatusFailed")}</option>
                <option value="needs_review">{t("paymentActivityStatusReview")}</option>
                <option value="duplicate">{t("paymentActivityStatusDuplicate")}</option>
              </>
            ) : (
              <>
                <option value="unattributable">{t("paymentActivityStatusUnattributable")}</option>
                <option value="technical">{t("paymentActivityStatusTechnical")}</option>
                <option value="pending">{t("paymentActivityStatusPending")}</option>
              </>
            )}
          </select>
        </div>
        <div className="flex items-center gap-1 self-end rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(["today", "7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                range === r ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t(
                r === "today"
                  ? "paymentActivityRangeToday"
                  : r === "7d"
                    ? "paymentActivityRange7"
                    : r === "30d"
                      ? "paymentActivityRange30"
                      : "paymentActivityRangeAll",
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 ${rtl ? "text-right" : "text-left"}`}>
              <th className="px-4 py-3">{t("paymentActivityColTime")}</th>
              <th className="px-4 py-3">{t("paymentActivityColOrder")}</th>
              <th className="px-4 py-3">{t("paymentActivityColCustomer")}</th>
              <th className="px-4 py-3">{t("paymentActivityColAmount")}</th>
              <th className="px-4 py-3">{t("paymentActivityColStatus")}</th>
              <th className="px-4 py-3">{t("paymentActivityColMessage")}</th>
              <th className="px-4 py-3">{t("paymentActivityColActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                  {tab === "business" ? t("paymentActivityEmpty") : t("paymentActivityEmptyTechnical")}
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const { date, time } = formatDateTime(e.createdAtISO, lang);
                const amount = formatAmount(e.order?.total ?? null);
                return (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      <div className="font-medium text-slate-800">{date}</div>
                      <div>{time}</div>
                    </td>
                    <td className="px-4 py-3">
                      {e.order ? (
                        <span className="font-mono text-[13px] font-semibold text-slate-900">
                          #{e.order.orderNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">{naLabel}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {e.order?.customerName || <span className="text-slate-400">{naLabel}</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-900">
                      {amount ?? <span className="text-slate-400">{naLabel}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge kind={e.kind} t={t} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t(messageKeyToI18n(e.messageKey))}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(e)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          {t("paymentActivityActionDetails")}
                        </button>
                        {e.order ? (
                          <Link
                            href={`/admin/orders?q=${encodeURIComponent(e.order.orderNumber)}`}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            {t("paymentActivityActionOpenOrder")}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 grid gap-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
            {tab === "business" ? t("paymentActivityEmpty") : t("paymentActivityEmptyTechnical")}
          </div>
        ) : (
          filtered.map((e) => {
            const { date, time } = formatDateTime(e.createdAtISO, lang);
            const amount = formatAmount(e.order?.total ?? null);
            return (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500">
                      {date} • {time}
                    </div>
                    <div className="mt-1 font-mono text-[13px] font-semibold text-slate-900">
                      {e.order ? `#${e.order.orderNumber}` : naLabel}
                    </div>
                  </div>
                  <StatusBadge kind={e.kind} t={t} />
                </div>
                <div className="mt-2 tabular-nums text-base font-semibold text-slate-900">
                  {amount ?? <span className="text-sm text-slate-400">{naLabel}</span>}
                </div>
                <div className="mt-1 text-sm text-slate-700">{t(messageKeyToI18n(e.messageKey))}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(e)}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    {t("paymentActivityActionDetails")}
                  </button>
                  {e.order ? (
                    <Link
                      href={`/admin/orders?q=${encodeURIComponent(e.order.orderNumber)}`}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      {t("paymentActivityActionOpenOrder")}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Details drawer/modal */}
      <AdminModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t("paymentActivityDrawerTitle")}
        size="lg"
      >
        {selected ? <DetailsBody event={selected} /> : null}
      </AdminModal>
    </div>
  );
}

// -----------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "fail" | "warn";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "fail"
        ? "text-rose-700"
        : tone === "warn"
          ? "text-amber-700"
          : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ kind, t }: { kind: EventKind; t: (k: string) => string }) {
  const b = kindToBadge(kind);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${b.className}`}
    >
      <span aria-hidden>{b.icon}</span>
      <span>{t(b.labelKey)}</span>
    </span>
  );
}

function DetailsBody({ event }: { event: EnrichedWebhookEvent }) {
  const { t, lang } = useAdminI18n();
  const [showTech, setShowTech] = useState(false);
  const { date, time } = formatDateTime(event.createdAtISO, lang);
  const captured = paymentCapturedAnswer(event);
  const needsAction = requiresAction(event);
  const naLabel = t("paymentActivityNotAvailable");
  const amount = formatAmount(event.order?.total ?? null);

  return (
    <div className="space-y-4 text-sm text-slate-800">
      {/* Business-facing summary */}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("paymentActivityDrawerStatus")}>
          <StatusBadge kind={event.kind} t={t} />
        </Field>
        <Field label={t("paymentActivityDrawerTime")}>
          {date} · {time}
        </Field>
        <Field label={t("paymentActivityDrawerOrder")}>
          {event.order ? (
            <Link
              href={`/admin/orders?q=${encodeURIComponent(event.order.orderNumber)}`}
              className="font-mono text-slate-900 underline decoration-slate-300 hover:decoration-slate-600"
            >
              #{event.order.orderNumber}
            </Link>
          ) : (
            <span className="text-slate-400">{naLabel}</span>
          )}
        </Field>
        <Field label={t("paymentActivityDrawerCustomer")}>
          {event.order?.customerName || <span className="text-slate-400">{naLabel}</span>}
        </Field>
        <Field label={t("paymentActivityDrawerAmount")}>
          {amount ?? <span className="text-slate-400">{naLabel}</span>}
        </Field>
        <Field label={t("paymentActivityDrawerProvider")}>{event.providerLabel}</Field>
        <Field label={t("paymentActivityDrawerTxId")}>
          {event.transactionId ? (
            <span className="font-mono text-[12px]">{event.transactionId}</span>
          ) : (
            <span className="text-slate-400">{naLabel}</span>
          )}
        </Field>
      </div>

      {/* What happened + explanation */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {t("paymentActivityDrawerWhat")}
        </div>
        <div className="mt-1">{t(messageKeyToI18n(event.messageKey))}</div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-white p-2 ring-1 ring-slate-100">
            <div className="text-slate-500">{t("paymentActivityDrawerCaptured")}</div>
            <div className="mt-0.5 font-semibold text-slate-800">
              {captured === "yes"
                ? t("paymentActivityDrawerCapturedYes")
                : captured === "no"
                  ? t("paymentActivityDrawerCapturedNo")
                  : t("paymentActivityDrawerCapturedUnknown")}
            </div>
          </div>
          <div className="rounded-md bg-white p-2 ring-1 ring-slate-100">
            <div className="text-slate-500">{t("paymentActivityDrawerAction")}</div>
            <div className="mt-0.5 font-semibold text-slate-800">
              {needsAction ? t("paymentActivityDrawerActionYes") : t("paymentActivityDrawerActionNo")}
            </div>
          </div>
        </div>
      </div>

      {/* Technical details — accordion, closed by default */}
      <div className="rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setShowTech((s) => !s)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          aria-expanded={showTech}
        >
          <span>{t("paymentActivityDrawerTechnical")}</span>
          <span aria-hidden>{showTech ? "▾" : "▸"}</span>
        </button>
        {showTech ? (
          <div className="space-y-3 border-t border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Field label={t("paymentActivityDrawerRawStatus")}>
                <span className="font-mono">{event.technical.rawStatus}</span>
              </Field>
              <Field label={t("paymentActivityDrawerHttp")}>
                <span className="font-mono">{event.technical.httpStatus ?? "—"}</span>
              </Field>
            </div>
            {event.technical.errorMessage ? (
              <Field label={t("paymentActivityDrawerErrorMessage")}>
                <span className="font-mono text-[12px] text-rose-700">{event.technical.errorMessage}</span>
              </Field>
            ) : null}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                {t("paymentActivityDrawerRawPayload")}
              </div>
              <pre className="mt-1 max-h-[40vh] overflow-auto rounded-md bg-slate-900 p-3 text-left text-[11px] leading-snug text-slate-100">
                {JSON.stringify(event.technical.payload ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
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
