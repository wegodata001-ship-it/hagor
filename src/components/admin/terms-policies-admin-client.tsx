"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  publishPolicyTab,
  restorePolicyTabDefaults,
  savePolicyDraft,
} from "@/app/admin/actions";
import type { PolicyTab } from "@/lib/legal-defaults";
import { LEGAL_FALLBACK } from "@/lib/legal-defaults";
import { useAdminI18n } from "@/lib/admin-i18n";
import {
  mergeDraft,
  parsePolicyDrafts,
  publishedAtField,
  type PolicyLang,
} from "@/lib/policy-storage";
import { PolicyRichEditor } from "@/components/admin/policy-rich-editor";
import { AdminSpinner } from "@/components/admin/admin-spinner";

export type LegalPublishedDTO = {
  terms_he: string | null;
  terms_en: string | null;
  terms_ar: string | null;
  privacy_he: string | null;
  privacy_en: string | null;
  privacy_ar: string | null;
  refund_he: string | null;
  refund_en: string | null;
  refund_ar: string | null;
  shipping_he: string | null;
  shipping_en: string | null;
  shipping_ar: string | null;
  termsPublishedAt: string | null;
  privacyPublishedAt: string | null;
  refundPublishedAt: string | null;
  shippingPublishedAt: string | null;
};

const PREVIEW_PATH: Record<PolicyTab, string> = {
  terms: "/terms",
  privacy: "/privacy",
  refund: "/refunds",
  shipping: "/shipping",
};

const TABS: PolicyTab[] = ["terms", "privacy", "refund", "shipping"];

function tabLabelKey(tab: PolicyTab): "tabTerms" | "tabPrivacy" | "tabRefund" | "tabShipping" {
  switch (tab) {
    case "terms":
      return "tabTerms";
    case "privacy":
      return "tabPrivacy";
    case "refund":
      return "tabRefund";
    case "shipping":
      return "tabShipping";
  }
}

export function TermsPoliciesAdminClient({
  published,
  policyDraftsRaw,
}: {
  published: LegalPublishedDTO;
  policyDraftsRaw: unknown;
}) {
  const router = useRouter();
  const { t, lang: adminLang } = useAdminI18n();

  const [tab, setTab] = useState<PolicyTab>("terms");
  const [lang, setLang] = useState<PolicyLang>("he");
  const [localDrafts, setLocalDrafts] = useState(() => parsePolicyDrafts(policyDraftsRaw));

  useEffect(() => {
    setLocalDrafts(parsePolicyDrafts(policyDraftsRaw));
  }, [policyDraftsRaw]);

  const baselineHtml = useCallback(
    (tTab: PolicyTab, tLang: PolicyLang): string => {
      const d = localDrafts[tTab]?.[tLang];
      if (d !== undefined) return d;
      const key = `${tTab}_${tLang}` as keyof LegalPublishedDTO;
      const p = published[key];
      if (typeof p === "string" && p.trim().length > 0) return p;
      return LEGAL_FALLBACK[tTab][tLang];
    },
    [localDrafts, published],
  );

  const [html, setHtml] = useState(() => baselineHtml("terms", "he"));
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHtml(baselineHtml(tab, lang));
    setDirty(false);
    // Only reset editor when switching tab or admin language column — not when drafts refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lang]);

  const persistDraft = useCallback(async () => {
    const res = await savePolicyDraft(tab, lang, html);
    if (!res.ok) {
      setToast(res.error ?? "Error");
      return;
    }
    setLocalDrafts((prev) => mergeDraft(prev, tab, lang, html));
    setDirty(false);
    setToast(t("savedSuccessfully"));
    router.refresh();
  }, [tab, lang, html, router, t]);

  useEffect(() => {
    if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    autoSaveTimer.current = setInterval(() => {
      if (!dirty) return;
      void (async () => {
        const res = await savePolicyDraft(tab, lang, html);
        if (res.ok) {
          setLocalDrafts((prev) => mergeDraft(prev, tab, lang, html));
          setDirty(false);
          router.refresh();
        }
      })();
    }, 25000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [dirty, tab, lang, html, router]);

  const switchTab = async (next: PolicyTab) => {
    if (next === tab) return;
    if (dirty) {
      const res = await savePolicyDraft(tab, lang, html);
      if (res.ok) setLocalDrafts((prev) => mergeDraft(prev, tab, lang, html));
    }
    setTab(next);
  };

  const switchLang = async (next: PolicyLang) => {
    if (next === lang) return;
    if (dirty) {
      const res = await savePolicyDraft(tab, lang, html);
      if (res.ok) setLocalDrafts((prev) => mergeDraft(prev, tab, lang, html));
    }
    setLang(next);
  };

  const onPublish = () => {
    startTransition(async () => {
      const draftSave = await savePolicyDraft(tab, lang, html);
      if (!draftSave.ok) {
        setToast(draftSave.error ?? "Error");
        return;
      }
      setLocalDrafts((prev) => mergeDraft(prev, tab, lang, html));
      const res = await publishPolicyTab(tab);
      if (!res.ok) {
        setToast(res.error ?? "Error");
        return;
      }
      setToast(t("savedSuccessfully"));
      setDirty(false);
      router.refresh();
    });
  };

  const onRestore = () => {
    if (!window.confirm("Restore default text for this section? Published content will be replaced.")) return;
    startTransition(async () => {
      const res = await restorePolicyTabDefaults(tab);
      if (!res.ok) {
        setToast(res.error ?? "Error");
        return;
      }
      setToast(t("savedSuccessfully"));
      router.refresh();
    });
  };

  const publishedAtKey = publishedAtField(tab);
  const publishedAtIso = published[publishedAtKey as keyof LegalPublishedDTO] as string | null;

  const editorDir: "rtl" | "ltr" = lang === "en" ? "ltr" : "rtl";

  return (
    <div className="pb-28">
      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/80 px-4 py-2 text-sm text-emerald-100">
          {toast}
          <button type="button" className="ms-3 text-emerald-300 underline" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{t("legalEditorTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("legalAutoSaveHint")}</p>
        </div>
        <Link href="/admin/settings" className="text-sm text-sky-400 hover:underline">
          ← {t("storeSettings")}
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => void switchTab(tb)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === tb ? "bg-white/15 text-white ring-1 ring-white/25" : "text-slate-400 hover:bg-white/5"
            }`}
          >
            {t(tabLabelKey(tb))}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Language</span>
        {(["he", "en", "ar"] as PolicyLang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => void switchLang(l)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              lang === l ? "bg-sky-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        {t("legalLastPublished")}:{" "}
        {publishedAtIso
          ? new Date(publishedAtIso).toLocaleString(adminLang === "en" ? "en-US" : adminLang === "ar" ? "ar" : "he-IL")
          : "—"}
      </div>

      <div className="mt-6">
        <PolicyRichEditor
          key={`${tab}-${lang}`}
          content={html}
          placeholder={t("legalPlaceholder")}
          dir={editorDir}
          onChange={(h) => {
            setHtml(h);
            setDirty(true);
          }}
        />
      </div>

      <div className="sticky bottom-4 z-30 mt-10 rounded-2xl border border-white/10 bg-[#0a0f1a]/95 px-4 py-3 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void persistDraft()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              {pending && <AdminSpinner className="h-4 w-4 border-t-white" />}
              {t("saveDraft")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onPublish}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {pending && <AdminSpinner className="h-4 w-4 border-t-white" />}
              {t("publishLegal")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onRestore}
              className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-sm font-medium text-red-100 hover:bg-red-950/70 disabled:opacity-50"
            >
              {t("restoreLegalDefaults")}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
              onClick={() => window.open(PREVIEW_PATH[tab], "_blank", "noopener,noreferrer")}
            >
              {t("previewLegalPage")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
