"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreOfficialLegalPage, saveOfficialLegalPage } from "@/app/admin/actions";
import { PolicyRichEditor } from "@/components/admin/policy-rich-editor";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { useAdminI18n } from "@/lib/admin-i18n";
import { LEGAL_PUBLIC_PATH, type OfficialLegalSlug } from "@/lib/official-legal-meta";

export type LegalDocumentEditorDTO = {
  slug: OfficialLegalSlug;
  title: string;
  contentHe: string;
  isPublished: boolean;
  updatedAt: string | null;
};

export function LegalDocumentEditorClient({ initial }: { initial: LegalDocumentEditorDTO }) {
  const router = useRouter();
  const { t, lang } = useAdminI18n();
  const [title, setTitle] = useState(initial.title);
  const [html, setHtml] = useState(initial.contentHe);
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locale = lang === "he" ? "he-IL" : lang === "ar" ? "ar" : "en-GB";

  function save() {
    setToast(null);
    const fd = new FormData();
    fd.set("slug", initial.slug);
    fd.set("title", title);
    fd.set("contentHe", html);
    fd.set("isPublished", isPublished ? "1" : "0");
    startTransition(async () => {
      const res = await saveOfficialLegalPage(fd);
      if (!res.ok) setToast(res.error ?? t("errorGeneric"));
      else {
        setToast(t("savedSuccessfully"));
        router.refresh();
      }
    });
  }

  function restore() {
    if (!confirm(t("restoreOfficialLegalConfirm"))) return;
    startTransition(async () => {
      const res = await restoreOfficialLegalPage(initial.slug);
      if (!res.ok) setToast(res.error ?? t("errorGeneric"));
      else {
        setToast(t("restoredDefaults"));
        router.refresh();
      }
    });
  }

  return (
    <div dir={lang === "en" ? "ltr" : "rtl"}>
      <Link href="/admin/content" className="text-sm text-slate-500 hover:text-slate-800">
        ← {t("legalDocuments")}
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("legalDocuments")}</p>
          <h1 className="text-xl font-semibold text-slate-900">{initial.title}</h1>
          {initial.updatedAt ? (
            <p className="mt-1 text-xs text-slate-400">
              {t("legalLastPublished")}: {new Date(initial.updatedAt).toLocaleString(locale)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            {isPublished ? t("legalPublished") : t("legalDraft")}
          </label>
          <Link
            href={LEGAL_PUBLIC_PATH[initial.slug]}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Preview
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

      <label className="mb-4 block text-sm font-medium text-slate-700">
        {t("pageTitle")}
        <input className="ds-input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <PolicyRichEditor
          content={html}
          dir="rtl"
          onChange={setHtml}
          placeholder={t("legalPlaceholder")}
        />
      </div>
    </div>
  );
}
