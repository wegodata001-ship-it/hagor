"use client";

import type { Locale } from "@/lib/localized";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export function LegalDocumentClient({
  fallback,
  titles,
  htmlByLang,
}: {
  fallback: Record<Locale, string>;
  titles: Readonly<Record<Locale, string>>;
  htmlByLang: { he: string | null; ar: string | null; en: string | null };
}) {
  const { lang, dir } = useStoreI18n();
  const raw = htmlByLang[lang]?.trim();
  const html = raw && raw.length > 0 ? raw : fallback[lang];

  return (
    <div dir={dir} className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <div className="ds-card-glass border-white/10 p-6 md:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50 md:text-3xl">{titles[lang]}</h1>
        <div
          className="terms-prose mt-6 text-sm leading-relaxed text-slate-300 [&_a]:text-blue-400 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-100 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ms-4 [&_ol]:list-decimal [&_p+p]:mt-3 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
