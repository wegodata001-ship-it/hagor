"use client";

import { useStoreI18n } from "@/components/storefront/store-i18n";

export function BenefitsRow() {
  const { t } = useStoreI18n();
  const items = [
    { icon: "🚚", text: t("benefit1") },
    { icon: "🛡️", text: t("benefit2") },
    { icon: "🔒", text: t("benefit3") },
    { icon: "🎧", text: t("benefit4") },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((b) => (
        <div key={b.text} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 shadow-lg shadow-black/30">
          <p className="text-xl text-orange-400">{b.icon}</p>
          <p className="mt-2 text-sm font-medium text-zinc-200">{b.text}</p>
        </div>
      ))}
    </section>
  );
}
