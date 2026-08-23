"use client";

import Link from "next/link";
import { useAdminI18n } from "@/lib/admin-i18n";
import { LEGAL_PUBLIC_PATH, type OfficialLegalSlug } from "@/lib/official-legal-meta";

export type LegalHubCard = {
  slug: OfficialLegalSlug;
  title: string;
  updatedAt: string | null;
  isPublished: boolean;
};

export function LegalDocumentsHubClient({ cards }: { cards: LegalHubCard[] }) {
  const { t, lang } = useAdminI18n();
  const locale = lang === "he" ? "he-IL" : lang === "ar" ? "ar" : "en-GB";

  return (
    <div dir={lang === "en" ? "ltr" : "rtl"}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("contentManagement")}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{t("legalDocuments")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("legalDocumentsSubtitle")}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  card.isPublished ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                }`}
              >
                {card.isPublished ? t("legalPublished") : t("legalDraft")}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {t("legalLastPublished")}:{" "}
              {card.updatedAt ? new Date(card.updatedAt).toLocaleString(locale) : "—"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/admin/content/${card.slug}`}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                {t("edit")}
              </Link>
              <Link
                href={LEGAL_PUBLIC_PATH[card.slug]}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Preview
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
