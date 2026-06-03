"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { restoreStoreContentPage, saveStoreContentPage } from "@/app/admin/actions";
import { PolicyRichEditor } from "@/components/admin/policy-rich-editor";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { useAdminI18n } from "@/lib/admin-i18n";
import type { HagourContentSlug } from "@/lib/store-pages";

type Lang = "he" | "en" | "ar";

export type StoreContentPageDTO = {
  slug: HagourContentSlug;
  title: string;
  contentHe: string;
  contentEn: string;
  contentAr: string;
  updatedAt: string | null;
};

const SLUG_META: Record<
  HagourContentSlug,
  { pageTitleKey: string; subtitleKey: string; confirmKey: string; previewPath: string }
> = {
  terms: {
    pageTitleKey: "storeTerms",
    subtitleKey: "storeTermsSubtitle",
    confirmKey: "restoreTermsConfirm",
    previewPath: "/terms",
  },
  privacy: {
    pageTitleKey: "storePrivacy",
    subtitleKey: "storePrivacySubtitle",
    confirmKey: "restorePrivacyConfirm",
    previewPath: "/privacy",
  },
  refunds: {
    pageTitleKey: "storeRefunds",
    subtitleKey: "storeRefundsSubtitle",
    confirmKey: "restoreRefundsConfirm",
    previewPath: "/refunds",
  },
};

export function StoreContentPageAdminClient({ initial }: { initial: StoreContentPageDTO }) {
  const router = useRouter();
  const { t, lang: adminLang } = useAdminI18n();
  const meta = SLUG_META[initial.slug];
  const [lang, setLang] = useState<Lang>("he");
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState<Record<Lang, string>>({
    he: initial.contentHe,
    en: initial.contentEn,
    ar: initial.contentAr,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currentHtml = content[lang];

  const setCurrentHtml = useCallback(
    (html: string) => {
      setContent((prev) => ({ ...prev, [lang]: html }));
    },
    [lang],
  );

  function save() {
    setToast(null);
    const fd = new FormData();
    fd.set("slug", initial.slug);
    fd.set("title", title);
    fd.set("contentHe", content.he);
    fd.set("contentEn", content.en);
    fd.set("contentAr", content.ar);
    startTransition(async () => {
      const res = await saveStoreContentPage(fd);
      if (!res.ok) setToast(res.error ?? t("errorGeneric"));
      else {
        setToast(t("savedSuccessfully"));
        router.refresh();
      }
    });
  }

  function restore() {
    if (!confirm(t(meta.confirmKey))) return;
    startTransition(async () => {
      const res = await restoreStoreContentPage(initial.slug);
      if (!res.ok) setToast(res.error ?? t("errorGeneric"));
      else {
        setToast(t("restoredDefaults"));
        router.refresh();
      }
    });
  }

  return (
    <div dir={adminLang === "en" ? "ltr" : "rtl"}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("contentManagement")}</p>
          <h1 className="text-xl font-semibold text-slate-900">{t(meta.pageTitleKey)}</h1>
          <p className="mt-1 text-sm text-slate-500">{t(meta.subtitleKey)}</p>
          {initial.updatedAt ? (
            <p className="mt-1 text-xs text-slate-400">
              {t("legalLastPublished")}: {new Date(initial.updatedAt).toLocaleString(adminLang === "he" ? "he-IL" : "en-GB")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={meta.previewPath}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("previewOnSite")}
          </Link>
          <button
            type="button"
            onClick={restore}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("restoreDefaults")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending && <AdminSpinner className="h-4 w-4 border-t-white" />}
            {t("save")}
          </button>
        </div>
      </div>

      {toast ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      <div className="mb-4 flex gap-2">
        {(["he", "en", "ar"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              lang === l ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {l === "he" ? t("hebrew") : l === "ar" ? t("arabic") : t("english")}
          </button>
        ))}
      </div>

      <label className="mb-4 block text-sm font-medium text-slate-700">
        {t("pageTitle")}
        <input className="ds-input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <PolicyRichEditor
          key={lang}
          content={currentHtml}
          dir={lang === "en" ? "ltr" : "rtl"}
          onChange={setCurrentHtml}
          placeholder={t("legalPlaceholder")}
        />
      </div>
    </div>
  );
}
