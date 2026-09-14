"use client";

import { useStoreI18n } from "@/components/storefront/store-i18n";
import type { Locale } from "@/lib/localized";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useStoreI18n();
  const langs: Locale[] = ["he", "ar", "en"];

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-[rgba(212,163,22,0.25)] bg-[#0d0d0d] ${
        compact ? "text-[10px]" : "text-xs"
      }`}
      role="group"
      aria-label="Language"
    >
      {langs.map((l, i) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`whitespace-nowrap px-2.5 py-1.5 font-semibold uppercase tracking-wide transition-colors duration-150 ${
            i > 0 ? "border-s border-[rgba(212,163,22,0.2)]" : ""
          } ${
            lang === l
              ? "bg-[#d6a316] text-black"
              : "bg-transparent text-zinc-300 hover:text-[#d6a316]"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
