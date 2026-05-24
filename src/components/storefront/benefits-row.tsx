"use client";

import { useStoreI18n } from "@/components/storefront/store-i18n";
import { HagourTrustIcon, TRUST_ICON_ITEMS } from "@/components/storefront/hagour-icon";

export function BenefitsRow() {
  const { t } = useStoreI18n();

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {TRUST_ICON_ITEMS.map((item) => (
        <div
          key={item.labelKey}
          className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-[#111111]/90 px-3 py-3.5 transition hover:border-hagor-gold/25"
        >
          <span className="hagour-icon-bg shrink-0" aria-hidden>
            <HagourTrustIcon name={item.name} />
          </span>
          <p className="text-xs font-medium leading-snug text-zinc-200 sm:text-sm">{t(item.labelKey)}</p>
        </div>
      ))}
    </section>
  );
}
