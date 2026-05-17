"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { MobileFilterDrawer } from "@/components/storefront/mobile-filter-drawer";

type Category = { id: string; parentId?: string | null; name_he: string; name_ar: string; name_en: string };

export function ProductFilters({
  categories,
  priceMin,
  priceMax,
}: {
  categories: Category[];
  priceMin: number;
  priceMax: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const { t, dir } = useStoreI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const min = sp.get("min") ?? "";
  const max = sp.get("max") ?? "";
  const sort = sp.get("sort") ?? "new";
  const cat = sp.get("cat") ?? "";
  const q = sp.get("q") ?? "";

  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  function apply(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/products?${params.toString()}`);
  }

  const form = (
    <div className="space-y-4" dir={dir}>
      <div>
        <label className="text-xs font-semibold text-zinc-400">{t("filterPrice")}</label>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            placeholder={`${priceMin}`}
            defaultValue={min}
            className="ds-input text-sm"
            onBlur={(e) => apply({ min: e.target.value || null })}
          />
          <input
            type="number"
            placeholder={`${priceMax}`}
            defaultValue={max}
            className="ds-input text-sm"
            onBlur={(e) => apply({ max: e.target.value || null })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-400">{t("filterSort")}</label>
        <select
          className="ds-select mt-2 text-sm"
          value={sort}
          onChange={(e) => apply({ sort: e.target.value })}
        >
          <option value="new">{t("sortNew")}</option>
          <option value="price-asc">{t("sortPriceAsc")}</option>
          <option value="price-desc">{t("sortPriceDesc")}</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-400">{t("categories")}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => apply({ cat: null })}
            className={`rounded-full border px-3 py-1 text-xs ${!cat ? "border-hagor-gold bg-hagor-gold/15 text-hagor-gold" : "border-zinc-700 text-zinc-300"}`}
          >
            {t("allProducts")}
          </button>
          {roots.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => apply({ cat: c.id })}
              className={`rounded-full border px-3 py-1 text-xs ${cat === c.id ? "border-hagor-gold bg-hagor-gold/15 text-hagor-gold" : "border-zinc-700 text-zinc-300"}`}
            >
              {c.name_he}
            </button>
          ))}
        </div>
      </div>
      {q ? <p className="text-xs text-zinc-500">חיפוש: {q}</p> : null}
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-medium text-white lg:hidden"
        onClick={() => setDrawerOpen(true)}
      >
        {t("filterOpen")}
      </button>
      <div className="hidden lg:block">{form}</div>
      <MobileFilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t("filterOpen")}>
        {form}
      </MobileFilterDrawer>
    </>
  );
}
