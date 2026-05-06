"use client";

import { useStoreI18n } from "@/components/storefront/store-i18n";

export function LanguageSwitcher() {
  const { lang, setLang } = useStoreI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-zinc-700 bg-zinc-900/70 text-xs">
      {(["he", "ar", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2 py-1 transition ${
            lang === l ? "bg-orange-500 text-white" : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
