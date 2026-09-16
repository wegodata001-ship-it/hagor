"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  deleteSavedRecipient,
  saveAccountantSettings,
  upsertSavedRecipient,
} from "@/app/admin/(panel)/invoices/actions";
import type { InvoiceArchiveSummary, InvoiceRowDTO } from "@/lib/invoices/data";
import type { InvoiceSendHistoryEntry } from "@/lib/invoices/send-history";
import type { RecipientKind, SavedRecipient } from "@/lib/invoices/recipients";

export type EmailProviderStatus = {
  provider: "smtp" | "resend" | "none";
  configured: boolean;
  missing: string[];
  fromAddress: string | null;
};

type Filters = {
  q: string;
  from: string;
  to: string;
};

type Scope = "ids" | "filtered" | "all" | "month";

type SendResult = {
  ok: true;
  mode: "attachment" | "link";
  fileCount: number;
  bytes: number;
  downloadUrl?: string;
  linkExpiresAt?: number;
  period: string;
  recipient: string;
  failed?: { orderId: string; reason: string }[];
};

type SendErrorPayload = {
  error: string;
  detail?: string;
};

const fieldClass =
  "h-10 w-full rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#c89211] focus:bg-white focus:ring-2 focus:ring-[#c89211]/15";

function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(
      lang === "en" ? "en-GB" : lang === "ar" ? "ar" : "he-IL",
      { day: "2-digit", month: "2-digit", year: "numeric" },
    );
  } catch {
    return iso;
  }
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function currentMonthLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function quickRange(kind: "thisMonth" | "prevMonth" | "thisQuarter" | "thisYear" | "prevYear") {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (kind === "thisMonth") {
    return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) };
  }
  if (kind === "prevMonth") {
    return { from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) };
  }
  if (kind === "thisQuarter") {
    const qStartMonth = Math.floor(m / 3) * 3;
    return {
      from: toISODate(new Date(y, qStartMonth, 1)),
      to: toISODate(new Date(y, qStartMonth + 3, 0)),
    };
  }
  if (kind === "thisYear") {
    return { from: toISODate(new Date(y, 0, 1)), to: toISODate(new Date(y, 11, 31)) };
  }
  return { from: toISODate(new Date(y - 1, 0, 1)), to: toISODate(new Date(y - 1, 11, 31)) };
}

async function downloadBlob(url: string, method: "GET" | "POST", body?: unknown): Promise<{
  ok: boolean;
  status: number;
  filename?: string;
  failuresBase64?: string;
  errorText?: string;
}> {
  const init: RequestInit = { method };
  if (method === "POST") {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body ?? {});
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    let errorText = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) errorText = j.error;
    } catch {
      /* fall through */
    }
    return { ok: false, status: res.status, errorText };
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const filename = decodeFilenameFromContentDisposition(disposition);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  return {
    ok: true,
    status: res.status,
    filename,
    failuresBase64: res.headers.get("X-Invoice-Failures") ?? undefined,
  };
}

function decodeFilenameFromContentDisposition(cd: string): string | undefined {
  // Try filename*=UTF-8''<encoded> first.
  const m1 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (m1?.[1]) {
    try {
      return decodeURIComponent(m1[1].trim());
    } catch {
      /* fall through */
    }
  }
  const m2 = /filename="?([^";]+)"?/i.exec(cd);
  return m2?.[1];
}

export function InvoicesAdminClient({
  initialFilters,
  rows,
  totalMatching,
  summary,
  history,
  accountantName,
  accountantEmail,
  savedRecipients,
  emailProvider,
}: {
  initialFilters: Filters;
  rows: InvoiceRowDTO[];
  totalMatching: number;
  summary: InvoiceArchiveSummary;
  history: InvoiceSendHistoryEntry[];
  accountantName: string | null;
  accountantEmail: string | null;
  savedRecipients: SavedRecipient[];
  emailProvider: EmailProviderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t, lang } = useAdminI18n();

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectAllInResults, setSelectAllInResults] = useState(false);

  const [toast, setToast] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<{ label: string } | null>(null);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendScope, setSendScope] = useState<Scope>("ids");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<SendErrorPayload | null>(null);
  const [sendPending, setSendPending] = useState(false);
  const [recipientOverride, setRecipientOverride] = useState("");

  const [emailModal, setEmailModal] = useState<null | InvoiceRowDTO>(null);
  const [emailPending, setEmailPending] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  // Single-invoice modal: which of the saved recipient rows is selected, or
  // "custom" when the operator wants to type an ad-hoc address.
  type PickedRecipient =
    | { kind: "accountant" }
    | { kind: "saved"; id: string }
    | { kind: "custom" };
  const [emailPicked, setEmailPicked] = useState<PickedRecipient>({ kind: "accountant" });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!downloadMenuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!downloadMenuRef.current?.contains(e.target as Node)) setDownloadMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [downloadMenuOpen]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const selectedIds = useMemo(
    () => rows.filter((r) => selected[r.id]).map((r) => r.id),
    [rows, selected],
  );
  const selectedCount = selectAllInResults ? totalMatching : selectedIds.length;

  const currentPageAllSelected =
    rows.length > 0 && rows.every((r) => selected[r.id]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    startTransition(() => router.push(`/admin/invoices?${params.toString()}`));
  };

  const clearFilters = () => {
    setFilters({ q: "", from: "", to: "" });
    startTransition(() => router.push("/admin/invoices"));
    setSelectAllInResults(false);
  };

  const applyQuickRange = (kind: Parameters<typeof quickRange>[0]) => {
    const r = quickRange(kind);
    setFilters((f) => ({ ...f, from: r.from, to: r.to }));
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    params.set("from", r.from);
    params.set("to", r.to);
    startTransition(() => router.push(`/admin/invoices?${params.toString()}`));
  };

  const togglePageSelectAll = () => {
    if (currentPageAllSelected) {
      setSelected({});
      setSelectAllInResults(false);
    } else {
      const next: Record<string, boolean> = {};
      rows.forEach((r) => (next[r.id] = true));
      setSelected(next);
    }
  };

  const toggleRow = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
    setSelectAllInResults(false);
  };

  const openSend = (scope: Scope) => {
    if (!accountantEmail && !recipientOverride) {
      setToast({ kind: "error", text: t("invoicesAccountantMissing") });
      return;
    }
    setSendScope(scope);
    setSendResult(null);
    setSendError(null);
    setSendModalOpen(true);
  };

  const performZipDownload = useCallback(
    async (scope: Scope) => {
      setBusy({ label: "ZIP" });
      setDownloadMenuOpen(false);
      const body: Record<string, unknown> = { scope, lang };
      if (scope === "ids") {
        if (selectAllInResults) {
          body.scope = "filtered";
          body.filters = { q: filters.q || undefined, from: filters.from || undefined, to: filters.to || undefined };
        } else {
          body.ids = selectedIds;
        }
      } else if (scope === "filtered") {
        body.filters = { q: filters.q || undefined, from: filters.from || undefined, to: filters.to || undefined };
      } else if (scope === "month") {
        body.archiveLabel = currentMonthLabel();
      } else if (scope === "all") {
        body.archiveLabel = "all";
      }
      const res = await downloadBlob("/api/admin/invoices/zip", "POST", body);
      setBusy(null);
      if (!res.ok) {
        setToast({ kind: "error", text: res.errorText || "ZIP failed" });
        return;
      }
      if (res.failuresBase64) {
        try {
          const decoded = JSON.parse(atob(res.failuresBase64)) as { orderId: string; reason: string }[];
          if (Array.isArray(decoded) && decoded.length > 0) {
            setToast({
              kind: "info",
              text: t("invoicesFailureSome")
                .replace("{ok}", String((res.filename ? 0 : 0) + (selectedCount - decoded.length)))
                .replace("{failed}", String(decoded.length))
                .replace("{total}", String(selectedCount)),
            });
            return;
          }
        } catch {
          /* ignore */
        }
      }
      setToast({ kind: "ok", text: res.filename ?? "ZIP downloaded" });
    },
    [filters.from, filters.q, filters.to, lang, selectAllInResults, selectedCount, selectedIds, t],
  );

  const performSend = useCallback(async () => {
    setSendPending(true);
    setSendError(null);
    setSendResult(null);
    const body: Record<string, unknown> = { scope: sendScope, lang };
    if (recipientOverride.trim()) body.recipientOverride = recipientOverride.trim();
    if (sendScope === "ids") {
      if (selectAllInResults) {
        body.scope = "filtered";
        body.filters = { q: filters.q || undefined, from: filters.from || undefined, to: filters.to || undefined };
      } else {
        body.ids = selectedIds;
      }
    } else if (sendScope === "filtered") {
      body.filters = { q: filters.q || undefined, from: filters.from || undefined, to: filters.to || undefined };
    } else if (sendScope === "month") {
      body.archiveLabel = currentMonthLabel();
    } else if (sendScope === "all") {
      body.archiveLabel = "all";
    }
    try {
      const res = await fetch("/api/admin/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || json.ok === false) {
        setSendError({
          error: (json.error as string) || "send_failed",
          detail: json.detail as string | undefined,
        });
      } else {
        setSendResult(json as unknown as SendResult);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setSendError({ error: e instanceof Error ? e.message : "send_failed" });
    } finally {
      setSendPending(false);
    }
  }, [filters.from, filters.q, filters.to, lang, recipientOverride, router, selectAllInResults, selectedIds, sendScope]);

  const resolveModalRecipient = useCallback((): { to: string; error?: string } => {
    if (emailPicked.kind === "accountant") {
      if (!accountantEmail) return { to: "", error: t("invoicesAccountantMissing") };
      return { to: accountantEmail };
    }
    if (emailPicked.kind === "saved") {
      const r = savedRecipients.find((x) => x.id === emailPicked.id);
      if (!r) return { to: "", error: t("invoicesAccountantMissing") };
      return { to: r.email };
    }
    const raw = emailValue.trim();
    if (!raw) return { to: "", error: t("invoicesEmailPromptRecipient") };
    // Case-insensitive validation; casing preserved for display.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(raw)) return { to: "", error: t("invoicesInvalidEmail") };
    return { to: raw };
  }, [emailPicked, accountantEmail, savedRecipients, emailValue, t]);

  const sendSingleInvoiceEmail = useCallback(async () => {
    if (!emailModal) return;
    setEmailError(null);
    const { to, error } = resolveModalRecipient();
    if (!to) {
      setEmailError(error ?? t("invoicesSingleEmailFail"));
      return;
    }
    setEmailPending(true);
    try {
      const res = await fetch(`/api/admin/invoices/${emailModal.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: to, lang }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        errorCode?: string;
        ok?: boolean;
        messageId?: string;
        provider?: string;
      };
      if (!res.ok || !json.ok) {
        // Show the actual provider-level error inline in the modal — no fake success.
        setEmailError(json.error ?? t("invoicesSingleEmailFail"));
      } else {
        setToast({
          kind: "ok",
          text: json.messageId
            ? `${t("invoicesSingleEmailOk")} · ${json.provider ?? ""} · ${json.messageId}`
            : t("invoicesSingleEmailOk"),
        });
        setEmailModal(null);
        setEmailError(null);
      }
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "send_failed");
    } finally {
      setEmailPending(false);
    }
  }, [emailModal, lang, resolveModalRecipient, t]);

  const saveAccountant = useCallback(async (formData: FormData) => {
    const res = await saveAccountantSettings(formData);
    if (!res.ok) {
      setToast({ kind: "error", text: res.error });
      return;
    }
    setToast({ kind: "ok", text: t("invoicesAccountantSaved") });
    startTransition(() => router.refresh());
  }, [router, t]);

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg px-4 py-2 text-sm ${
            toast.kind === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : toast.kind === "info"
                ? "border border-amber-200 bg-amber-50 text-amber-900"
                : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("invoicesArchive")}</h1>
          <p className="text-sm text-slate-500">{t("invoicesArchiveSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div ref={downloadMenuRef} className="relative">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              onClick={() => setDownloadMenuOpen((v) => !v)}
            >
              {t("invoicesBulkDownload")}
              <svg width={14} height={14} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M5 8l5 5 5-5H5z" />
              </svg>
            </button>
            {downloadMenuOpen ? (
              <div className="absolute end-0 z-30 mt-1 min-w-[220px] rounded-xl border border-[#E8E8E8] bg-white py-1 shadow-lg">
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  className="block w-full px-3 py-2 text-start text-[13px] text-[#111827] hover:bg-[#F7F8FA] disabled:opacity-40"
                  onClick={() => performZipDownload("ids")}
                >
                  {t("invoicesBulkDownloadZipSelected")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-start text-[13px] text-[#111827] hover:bg-[#F7F8FA]"
                  onClick={() => performZipDownload("month")}
                >
                  {t("invoicesBulkDownloadThisMonth")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-start text-[13px] text-[#111827] hover:bg-[#F7F8FA]"
                  onClick={() => performZipDownload("filtered")}
                >
                  {t("invoicesBulkDownloadFiltered")}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-start text-[13px] text-[#111827] hover:bg-[#F7F8FA]"
                  onClick={() => performZipDownload("all")}
                >
                  {t("invoicesBulkDownloadAll")}
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#c89211] bg-white px-4 text-sm font-medium text-[#8A6A12] hover:bg-[#FFF8E8]"
            onClick={() => openSend(selectedCount > 0 ? "ids" : "filtered")}
          >
            {t("invoicesSendToAccountant")}
          </button>
        </div>
      </header>

      {/* Summary */}
      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label={t("invoicesTotalAll")} value={summary.totalAll} />
        <SummaryCard label={t("invoicesTotalPeriod")} value={summary.totalInPeriod} highlight />
        <SummaryCard label={t("invoicesTotalMonth")} value={summary.totalThisMonth} />
      </section>

      {/* Email provider configuration banner — shown when SMTP/Resend not configured */}
      {!emailProvider.configured ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{t("invoicesEmailNotConfigured")}</div>
              {emailProvider.missing.length > 0 ? (
                <div className="mt-1 text-xs text-amber-800">
                  {t("invoicesEmailMissingEnv")}{" "}
                  <span className="font-mono">{emailProvider.missing.join(", ")}</span>
                </div>
              ) : null}
              <div className="mt-1 text-xs text-amber-800">{t("invoicesEmailProviderHelp")}</div>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-700">
              {emailProvider.provider}
            </span>
          </div>
        </section>
      ) : null}

      {/* Accountant block */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{t("invoicesAccountantTitle")}</h2>
            <p className="text-xs text-slate-500">
              {accountantEmail ? accountantEmail : t("invoicesAccountantMissing")}
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="text-xs font-medium text-[#8A6A12] hover:underline"
          >
            {t("edit")}
          </Link>
        </div>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void saveAccountant(fd);
          }}
        >
          <label className="text-xs font-medium text-slate-700">
            {t("invoicesAccountantName")}
            <input
              name="accountantName"
              defaultValue={accountantName ?? ""}
              maxLength={160}
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            {t("invoicesAccountantEmail")}
            <input
              name="accountantEmail"
              type="email"
              defaultValue={accountantEmail ?? ""}
              placeholder="accountant@example.com"
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <button
            type="submit"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t("save")}
          </button>
        </form>

        {/* Saved secondary recipients */}
        <SavedRecipientsPanel
          recipients={savedRecipients}
          onChanged={() => startTransition(() => router.refresh())}
          onError={(text) => setToast({ kind: "error", text })}
          onSuccess={(text) => setToast({ kind: "ok", text })}
        />
      </section>

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
        >
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder={t("invoicesSearchPlaceholder")}
            className={fieldClass}
          />
          <label className="text-xs font-medium text-slate-600">
            {t("invoicesRangeFrom")}
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            {t("invoicesRangeTo")}
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {t("filterApply")}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t("clearFilters")}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickPill onClick={() => applyQuickRange("thisMonth")}>{t("invoicesQuickThisMonth")}</QuickPill>
          <QuickPill onClick={() => applyQuickRange("prevMonth")}>{t("invoicesQuickPrevMonth")}</QuickPill>
          <QuickPill onClick={() => applyQuickRange("thisQuarter")}>{t("invoicesQuickThisQuarter")}</QuickPill>
          <QuickPill onClick={() => applyQuickRange("thisYear")}>{t("invoicesQuickThisYear")}</QuickPill>
          <QuickPill onClick={() => applyQuickRange("prevYear")}>{t("invoicesQuickPrevYear")}</QuickPill>
        </div>
      </section>

      {/* Action bar */}
      {selectedCount > 0 ? (
        <div className="sticky top-14 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c89211]/40 bg-[#FFF8E8] p-3 shadow-sm">
          <div className="text-sm font-medium text-[#5c4708]">
            {t("invoicesSelected").replace("{count}", String(selectedCount))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => performZipDownload("ids")}
              className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-3 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? <AdminSpinner className="me-2 h-4 w-4 border-t-white" /> : null}
              {t("invoicesBulkDownloadZipSelected")}
            </button>
            <button
              type="button"
              onClick={() => openSend("ids")}
              className="inline-flex h-9 items-center rounded-lg border border-[#c89211] bg-white px-3 text-[13px] font-medium text-[#8A6A12] hover:bg-[#FFF8E8]"
            >
              {t("invoicesSendToAccountant")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Table (desktop) + Cards (mobile) */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-[#FAFAFA] text-[11px] uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    aria-label={t("invoicesSelectAll")}
                    checked={currentPageAllSelected}
                    onChange={togglePageSelectAll}
                  />
                </th>
                <th className="px-3 py-3 text-start">{t("invoicesColDocument")}</th>
                <th className="px-3 py-3 text-start">{t("date")}</th>
                <th className="px-3 py-3 text-start">{t("invoicesColOrder")}</th>
                <th className="px-3 py-3 text-start">{t("invoicesColCustomer")}</th>
                <th className="px-3 py-3 text-start">{t("invoicesColAmount")}</th>
                <th className="px-3 py-3 text-start">{t("invoicesColStatus")}</th>
                <th className="px-3 py-3 text-end">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">
                    {t("invoicesEmpty")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 hover:bg-[#FAFAFA]"
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!selected[r.id]}
                        onChange={() => toggleRow(r.id)}
                        aria-label={r.documentNumber}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-[13px] text-slate-800">{r.documentNumber}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDate(r.createdAt, lang)}</td>
                    <td className="px-3 py-2 font-mono text-[13px] text-slate-700">{r.orderNumber}</td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="truncate">{r.customerName}</div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      ₪{r.total.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.paymentStatus} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <ActionLink href={`/admin/orders?q=${encodeURIComponent(r.orderNumber)}`} label={t("invoicesActionView")} />
                        <ActionButton
                          label={t("invoicesActionPdf")}
                          onClick={() => window.open(`/api/admin/invoices/${r.id}/pdf?lang=${lang}`, "_blank", "noopener")}
                        />
                        <ActionButton
                          label={t("invoicesActionEmail")}
                          onClick={() => {
                            setEmailValue("");
                            setEmailError(null);
                            setEmailPicked(
                              accountantEmail
                                ? { kind: "accountant" }
                                : savedRecipients[0]
                                  ? { kind: "saved", id: savedRecipients[0].id }
                                  : { kind: "custom" },
                            );
                            setEmailModal(r);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 p-3 md:hidden">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
              {t("invoicesEmpty")}
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!selected[r.id]}
                      onChange={() => toggleRow(r.id)}
                    />
                    <div>
                      <div className="font-mono text-[13px] font-semibold text-slate-900">{r.documentNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatDate(r.createdAt, lang)} · {r.orderNumber}
                      </div>
                    </div>
                  </label>
                  <StatusBadge status={r.paymentStatus} />
                </div>
                <div className="mt-2 text-sm text-slate-700">{r.customerName}</div>
                <div className="mt-1 text-base font-semibold text-slate-900">₪{r.total.toFixed(2)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionLink href={`/admin/orders?q=${encodeURIComponent(r.orderNumber)}`} label={t("invoicesActionView")} />
                  <ActionButton
                    label={t("invoicesActionPdf")}
                    onClick={() => window.open(`/api/admin/invoices/${r.id}/pdf?lang=${lang}`, "_blank", "noopener")}
                  />
                  <ActionButton
                    label={t("invoicesActionEmail")}
                    onClick={() => {
                      setEmailValue("");
                      setEmailError(null);
                      setEmailPicked(
                        accountantEmail
                          ? { kind: "accountant" }
                          : savedRecipients[0]
                            ? { kind: "saved", id: savedRecipients[0].id }
                            : { kind: "custom" },
                      );
                      setEmailModal(r);
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Select-all-in-results affordance */}
        {rows.length > 0 && totalMatching > rows.length ? (
          <div className="border-t border-slate-100 bg-[#FAFAFA] px-4 py-2 text-xs text-slate-600">
            {currentPageAllSelected && !selectAllInResults ? (
              <button
                type="button"
                onClick={() => setSelectAllInResults(true)}
                className="text-[#8A6A12] hover:underline"
              >
                {t("invoicesSelectAllInResults").replace("{count}", String(totalMatching))}
              </button>
            ) : selectAllInResults ? (
              <span className="text-[#8A6A12]">
                {t("invoicesSelectAllInResults").replace("{count}", String(totalMatching))}
              </span>
            ) : (
              <span>
                {t("showingProductsCount")
                  .replace("{shown}", String(rows.length))
                  .replace("{total}", String(totalMatching))}
              </span>
            )}
          </div>
        ) : null}
      </section>

      {/* Send history */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">{t("invoicesSendHistoryTitle")}</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">{t("invoicesSendHistoryEmpty")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-2 py-2 text-start">{t("date")}</th>
                  <th className="px-2 py-2 text-start">{t("invoicesSendModalPeriod")}</th>
                  <th className="px-2 py-2 text-start">{t("invoicesSendModalCount")}</th>
                  <th className="px-2 py-2 text-start">{t("invoicesSendModalRecipient")}</th>
                  <th className="px-2 py-2 text-start">{t("invoicesSendModalSize")}</th>
                  <th className="px-2 py-2 text-start">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 text-slate-700">
                      {new Date(h.createdAt).toLocaleString(
                        lang === "en" ? "en-GB" : lang === "ar" ? "ar" : "he-IL",
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-700">{h.metadata.periodLabel}</td>
                    <td className="px-2 py-2 font-semibold text-slate-900">{h.metadata.invoiceCount}</td>
                    <td className="px-2 py-2 text-slate-700">{h.metadata.recipient}</td>
                    <td className="px-2 py-2 text-slate-500">
                      {formatBytes(h.metadata.bytes)}
                      {h.metadata.mode === "link" ? " · link" : " · attach"}
                    </td>
                    <td className="px-2 py-2">
                      {h.metadata.status === "accepted" ? (
                        <span
                          className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"
                          title={
                            h.metadata.providerMessageId
                              ? `${h.metadata.provider ?? ""} · ${h.metadata.providerMessageId}`
                              : t("invoicesStatusAccepted")
                          }
                        >
                          {t("invoicesStatusAccepted")}
                        </span>
                      ) : h.metadata.status === "delivered" ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          {t("invoicesStatusDelivered")}
                        </span>
                      ) : (
                        <span
                          className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700"
                          title={h.metadata.error ?? h.metadata.errorCode ?? ""}
                        >
                          {t("invoicesStatusFailed")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Send modal */}
      <AdminModal
        open={sendModalOpen}
        title={t("invoicesSendModalTitle")}
        onClose={() => setSendModalOpen(false)}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setSendModalOpen(false)}
            >
              {t("invoicesSendModalCancel")}
            </button>
            {sendResult ? null : (
              <button
                type="button"
                disabled={sendPending}
                onClick={performSend}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {sendPending ? <AdminSpinner className="h-4 w-4 border-t-white" /> : null}
                {sendPending ? t("invoicesSendModalSending") : t("invoicesSendModalConfirm")}
              </button>
            )}
          </div>
        }
      >
        {sendResult ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              ✓ {sendResult.mode === "link" ? t("invoicesSendOkLink") : t("invoicesSendOkAttachment")}
            </div>
            <div>
              <div className="text-xs text-slate-500">{t("invoicesSendModalRecipient")}</div>
              <div className="font-medium text-slate-800">{sendResult.recipient}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t("invoicesSendModalPeriod")}</div>
              <div className="font-medium text-slate-800">{sendResult.period}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t("invoicesSendModalCount")}</div>
              <div className="font-medium text-slate-800">{sendResult.fileCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t("invoicesSendSize")}</div>
              <div className="font-medium text-slate-800">{formatBytes(sendResult.bytes)}</div>
            </div>
            {sendResult.downloadUrl ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {t("invoicesLinkFallback")}
              </div>
            ) : null}
            {sendResult.failed && sendResult.failed.length > 0 ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <div className="font-semibold">{t("invoicesFailureListLabel")}:</div>
                <ul className="mt-1 list-disc pl-4">
                  {sendResult.failed.map((f) => (
                    <li key={f.orderId}>
                      {f.orderId} — {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : sendError ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
              ✗ {sendError.error === "send_failed" ? t("invoicesSendFail") : sendError.error}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={performSend}
            >
              {t("invoicesSendRetry")}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">{t("invoicesSendModalRecipient")}</div>
              <input
                type="email"
                value={recipientOverride || accountantEmail || ""}
                onChange={(e) => setRecipientOverride(e.target.value)}
                className={`mt-1 ${fieldClass}`}
                placeholder="accountant@example.com"
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">{t("invoicesSendModalPeriod")}</div>
              <select
                value={sendScope}
                onChange={(e) => setSendScope(e.target.value as Scope)}
                className={`mt-1 ${fieldClass}`}
              >
                <option value="ids">
                  {selectedCount > 0
                    ? t("invoicesBulkDownloadZipSelected")
                    : t("invoicesBulkDownloadFiltered")}
                </option>
                <option value="filtered">{t("invoicesBulkDownloadFiltered")}</option>
                <option value="month">{t("invoicesBulkDownloadThisMonth")}</option>
                <option value="all">{t("invoicesBulkDownloadAll")}</option>
              </select>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {t("invoicesLarge")} {t("invoicesLinkFallback")}
            </div>
          </div>
        )}
      </AdminModal>

      {/* Single-invoice email modal — redesigned per §9. Default recipient is
          the saved accountant; saved secondary recipients + custom email are
          selectable radios. Errors surface inline; no fake success. */}
      <AdminModal
        open={emailModal != null}
        title={t("invoicesEmailPromptTitle")}
        size="md"
        onClose={() => setEmailModal(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setEmailModal(null)}
            >
              {t("invoicesSendModalCancel")}
            </button>
            <button
              type="button"
              disabled={emailPending}
              onClick={sendSingleInvoiceEmail}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {emailPending ? <AdminSpinner className="h-4 w-4 border-t-white" /> : null}
              {t("invoicesEmailPromptSend")}
            </button>
          </div>
        }
      >
        {emailModal ? (
          <div className="space-y-4 text-sm">
            {!emailProvider.configured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {t("invoicesEmailNotConfigured")}
                {emailProvider.missing.length > 0 ? (
                  <div className="mt-1 font-mono text-[10px] text-amber-800">
                    {emailProvider.missing.join(", ")}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("invoicesEmailPromptDoc")}
                </div>
                <div className="mt-0.5 font-mono text-[13px] font-semibold text-slate-900">
                  {emailModal.documentNumber}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("invoicesEmailPromptOrder")}
                </div>
                <div className="mt-0.5 font-mono text-[13px] font-semibold text-slate-900">
                  {emailModal.orderNumber}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-800">
                {t("invoicesEmailPromptSendTo")}
              </div>
              <div className="mt-2 space-y-2">
                {accountantEmail ? (
                  <RecipientOption
                    id="rcpt-accountant"
                    checked={emailPicked.kind === "accountant"}
                    onChange={() => setEmailPicked({ kind: "accountant" })}
                    title={accountantName || t("invoicesAccountantTitle")}
                    subtitle={accountantEmail}
                    badge={t("invoicesRecipientKindAccountant")}
                  />
                ) : null}
                {savedRecipients.map((r) => (
                  <RecipientOption
                    key={r.id}
                    id={`rcpt-${r.id}`}
                    checked={emailPicked.kind === "saved" && emailPicked.id === r.id}
                    onChange={() => setEmailPicked({ kind: "saved", id: r.id })}
                    title={r.name}
                    subtitle={r.email}
                    badge={t(recipientKindKey(r.kind))}
                  />
                ))}
                <RecipientOption
                  id="rcpt-custom"
                  checked={emailPicked.kind === "custom"}
                  onChange={() => setEmailPicked({ kind: "custom" })}
                  title={t("invoicesEmailPromptCustom")}
                >
                  {emailPicked.kind === "custom" ? (
                    <input
                      type="email"
                      autoFocus
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      onFocus={() => setEmailPicked({ kind: "custom" })}
                      placeholder="user@example.com"
                      className={`mt-2 ${fieldClass}`}
                    />
                  ) : null}
                </RecipientOption>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                {t("invoicesEmailPromptAttachment")}
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-slate-900">
                {defaultInvoiceFilename(emailModal.documentNumber)}
              </div>
            </div>

            {emailError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {emailError}
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        highlight
          ? "border-[#c89211]/40 bg-[#FFF8E8]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value.toLocaleString()}</div>
    </div>
  );
}

function QuickPill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function RecipientOption({
  id,
  checked,
  onChange,
  title,
  subtitle,
  badge,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={`block cursor-pointer rounded-lg border p-3 transition ${
        checked
          ? "border-[#c89211] bg-[#FFF8E8]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="radio"
          name="invoice-recipient"
          checked={checked}
          onChange={onChange}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <span className="truncate">{title}</span>
            {badge ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <div className="mt-0.5 truncate font-mono text-[12px] text-slate-500">{subtitle}</div>
          ) : null}
          {children}
        </div>
      </div>
    </label>
  );
}

function recipientKindKey(kind: RecipientKind | undefined): string {
  if (kind === "accountant") return "invoicesRecipientKindAccountant";
  if (kind === "bookkeeping") return "invoicesRecipientKindBookkeeping";
  return "invoicesRecipientKindOther";
}

function defaultInvoiceFilename(documentNumber: string): string {
  const safe = (documentNumber || "invoice").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80);
  return `${safe}.pdf`;
}

function SavedRecipientsPanel({
  recipients,
  onChanged,
  onError,
  onSuccess,
}: {
  recipients: SavedRecipient[];
  onChanged: () => void;
  onError: (text: string) => void;
  onSuccess: (text: string) => void;
}) {
  const { t } = useAdminI18n();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const handleAdd = async (fd: FormData) => {
    setBusy("add");
    try {
      const res = await upsertSavedRecipient(fd);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onSuccess(t("invoicesRecipientSaved"));
      setAdding(false);
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("invoicesRecipientDeleteConfirm"))) return;
    setBusy(id);
    try {
      const fd = new FormData();
      fd.append("id", id);
      const res = await deleteSavedRecipient(fd);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onSuccess(t("invoicesRecipientDeleted"));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("invoicesSavedRecipientsTitle")}
        </h3>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-medium text-[#8A6A12] hover:underline"
          >
            + {t("invoicesSavedRecipientsAdd")}
          </button>
        ) : null}
      </div>

      {recipients.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-slate-500">{t("invoicesSavedRecipientsEmpty")}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {recipients.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <span className="truncate">{r.name}</span>
                  <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {t(recipientKindKey(r.kind))}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[12px] text-slate-500">
                  {r.email}
                </div>
              </div>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => void handleDelete(r.id)}
                className="text-xs text-rose-600 hover:underline disabled:opacity-40"
              >
                {t("delete")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form
          className="mt-3 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_140px_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void handleAdd(fd);
          }}
        >
          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("invoicesAccountantName")}
            <input
              name="name"
              required
              maxLength={160}
              placeholder={t("invoicesAccountantName")}
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("invoicesAccountantEmail")}
            <input
              name="email"
              type="email"
              required
              maxLength={200}
              placeholder="user@example.com"
              className={`mt-1 ${fieldClass}`}
            />
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t("invoicesSavedRecipientsKind")}
            <select name="kind" defaultValue="other" className={`mt-1 ${fieldClass}`}>
              <option value="accountant">{t("invoicesRecipientKindAccountant")}</option>
              <option value="bookkeeping">{t("invoicesRecipientKindBookkeeping")}</option>
              <option value="other">{t("invoicesRecipientKindOther")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="mt-5 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100"
          >
            {t("invoicesSendModalCancel")}
          </button>
          <button
            type="submit"
            disabled={busy === "add"}
            className="mt-5 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white disabled:opacity-60"
          >
            {busy === "add" ? <AdminSpinner className="h-3 w-3 border-t-white" /> : null}
            {t("save")}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useAdminI18n();
  if (status === "PAID") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
        {t("badgePaid")}
      </span>
    );
  }
  if (status === "TEST_PAID") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
        {t("testPaymentBadge")}
      </span>
    );
  }
  if (status === "DEMO_PAID") {
    return (
      <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
        {t("demoPaymentBadge")}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      {status}
    </span>
  );
}
