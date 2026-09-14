"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { MobileFilterDrawer } from "@/components/storefront/mobile-filter-drawer";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import {
  DEFAULT_FILTER_STATE,
  filterAndSortHomeProducts,
  hasActiveFilters,
  parseFilterState,
  writeFilterParams,
  type HomeProductCard,
  type PriceBucket,
  type ProductFilterState,
  type ProductSort,
  type StockFilter,
} from "@/lib/home-product-filters";

type Category = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function HomeProductsSection({
  products,
  categories,
}: {
  products: HomeProductCard[];
  categories: Category[];
}) {
  const { t, lang, dir } = useStoreI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const urlState = useMemo(() => parseFilterState(searchParams), [searchParams]);
  const [draftQ, setDraftQ] = useState(urlState.q);
  const debouncedQ = useDebouncedValue(draftQ, 300);

  useEffect(() => {
    setDraftQ(urlState.q);
  }, [urlState.q]);

  const pushState = useCallback(
    (next: ProductFilterState) => {
      const params = writeFilterParams(next);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  useEffect(() => {
    if (debouncedQ === urlState.q) return;
    pushState({ ...urlState, q: debouncedQ });
  }, [debouncedQ, urlState, pushState]);

  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const filtered = useMemo(
    () => filterAndSortHomeProducts(products, { ...urlState, q: debouncedQ }, lang),
    [products, urlState, debouncedQ, lang],
  );

  const active = hasActiveFilters({ ...urlState, q: debouncedQ });

  function patch(partial: Partial<ProductFilterState>) {
    pushState({ ...urlState, q: debouncedQ, ...partial });
  }

  function reset() {
    setDraftQ("");
    pushState({ ...DEFAULT_FILTER_STATE });
  }

  const filtersForm = (
    <div className="space-y-4" dir={dir}>
      <label className="block text-xs font-semibold text-zinc-400">
        {t("productSearch")}
        <input
          type="search"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder={t("productSearchPlaceholder")}
          className="ds-input mt-2 w-full text-sm"
        />
      </label>

      <label className="block text-xs font-semibold text-zinc-400">
        {t("sortBy")}
        <select
          className="ds-select mt-2 w-full text-sm"
          value={urlState.sort}
          onChange={(e) => patch({ sort: e.target.value as ProductSort })}
        >
          <option value="popular">{t("sortPopular")}</option>
          <option value="newest">{t("sortNewest")}</option>
          <option value="price-asc">{t("sortPriceLowHigh")}</option>
          <option value="price-desc">{t("sortPriceHighLow")}</option>
          <option value="name-asc">{t("sortNameAsc")}</option>
          <option value="name-desc">{t("sortNameDesc")}</option>
        </select>
      </label>

      <div>
        <p className="text-xs font-semibold text-zinc-400">{t("filterCategory")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patch({ categoryId: "" })}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              !urlState.categoryId
                ? "border-hagor-gold bg-hagor-gold/15 text-hagor-gold"
                : "border-zinc-700 text-zinc-300 hover:border-hagor-gold/40"
            }`}
          >
            {t("filterAll")}
          </button>
          {roots.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => patch({ categoryId: c.id })}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                urlState.categoryId === c.id
                  ? "border-hagor-gold bg-hagor-gold/15 text-hagor-gold"
                  : "border-zinc-700 text-zinc-300 hover:border-hagor-gold/40"
              }`}
            >
              {pickLocalized(c, "name", lang)}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-xs font-semibold text-zinc-400">
        {t("filterPrice")}
        <select
          className="ds-select mt-2 w-full text-sm"
          value={urlState.price}
          onChange={(e) => patch({ price: e.target.value as PriceBucket })}
        >
          <option value="all">{t("priceAll")}</option>
          <option value="under100">{t("priceUnder100")}</option>
          <option value="100-200">{t("price100to200")}</option>
          <option value="200-400">{t("price200to400")}</option>
          <option value="over400">{t("priceOver400")}</option>
        </select>
      </label>

      <label className="block text-xs font-semibold text-zinc-400">
        {t("filterStock")}
        <select
          className="ds-select mt-2 w-full text-sm"
          value={urlState.stock}
          onChange={(e) => patch({ stock: e.target.value as StockFilter })}
        >
          <option value="in">{t("stockInOnly")}</option>
          <option value="all">{t("stockAll")}</option>
        </select>
      </label>

      {active ? (
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-xl border border-hagor-gold/40 px-3 py-2 text-sm font-medium text-hagor-gold hover:bg-hagor-gold/10"
        >
          {t("resetFilters")}
        </button>
      ) : null}
    </div>
  );

  return (
    <section id="home-products" className="w-full scroll-mt-24" dir={dir}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{t("featuredProducts")}</h2>
        <Link href="/products" className="shrink-0 text-sm font-medium text-hagor-gold hover:underline">
          {t("viewAll")}
        </Link>
      </div>

      {/* Desktop horizontal filters */}
      <div className="mb-4 hidden gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-950/50 p-3 lg:grid lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] lg:items-end">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("productSearch")}
          <input
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder={t("productSearchPlaceholder")}
            className="ds-input mt-1.5 w-full text-sm"
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("sortBy")}
          <select
            className="ds-select mt-1.5 w-full text-sm"
            value={urlState.sort}
            onChange={(e) => patch({ sort: e.target.value as ProductSort })}
          >
            <option value="popular">{t("sortPopular")}</option>
            <option value="newest">{t("sortNewest")}</option>
            <option value="price-asc">{t("sortPriceLowHigh")}</option>
            <option value="price-desc">{t("sortPriceHighLow")}</option>
            <option value="name-asc">{t("sortNameAsc")}</option>
            <option value="name-desc">{t("sortNameDesc")}</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("filterCategory")}
          <select
            className="ds-select mt-1.5 w-full text-sm"
            value={urlState.categoryId}
            onChange={(e) => patch({ categoryId: e.target.value })}
          >
            <option value="">{t("filterAll")}</option>
            {roots.map((c) => (
              <option key={c.id} value={c.id}>
                {pickLocalized(c, "name", lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("filterPrice")}
          <select
            className="ds-select mt-1.5 w-full text-sm"
            value={urlState.price}
            onChange={(e) => patch({ price: e.target.value as PriceBucket })}
          >
            <option value="all">{t("priceAll")}</option>
            <option value="under100">{t("priceUnder100")}</option>
            <option value="100-200">{t("price100to200")}</option>
            <option value="200-400">{t("price200to400")}</option>
            <option value="over400">{t("priceOver400")}</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("filterStock")}
          <select
            className="ds-select mt-1.5 w-full text-sm"
            value={urlState.stock}
            onChange={(e) => patch({ stock: e.target.value as StockFilter })}
          >
            <option value="in">{t("stockInOnly")}</option>
            <option value="all">{t("stockAll")}</option>
          </select>
        </label>
      </div>

      {/* Category chips desktop */}
      <div className="mb-4 hidden flex-wrap gap-2 lg:flex">
        <button
          type="button"
          onClick={() => patch({ categoryId: "" })}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            !urlState.categoryId
              ? "border-hagor-gold bg-hagor-gold/15 text-hagor-gold"
              : "border-zinc-700 text-zinc-300 hover:border-hagor-gold/40"
          }`}
        >
          {t("filterAll")}
        </button>
        {roots.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => patch({ categoryId: c.id })}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              urlState.categoryId === c.id
                ? "border-hagor-gold bg-hagor-gold/15 text-hagor-gold"
                : "border-zinc-700 text-zinc-300 hover:border-hagor-gold/40"
            }`}
          >
            {pickLocalized(c, "name", lang)}
          </button>
        ))}
      </div>

      {/* Mobile filter trigger + compact search */}
      <div className="mb-4 space-y-3 lg:hidden">
        <input
          type="search"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder={t("productSearchPlaceholder")}
          className="ds-input w-full text-sm"
        />
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-medium text-white"
          onClick={() => setDrawerOpen(true)}
        >
          {t("filterAndSort")}
        </button>
      </div>

      <MobileFilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t("filterAndSort")}>
        {filtersForm}
      </MobileFilterDrawer>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">
          {t("productsFound").replace("{count}", String(filtered.length))}
        </p>
        {active ? (
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-hagor-gold hover:underline"
          >
            {t("resetFilters")}
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[18px] border border-zinc-800 bg-[#111] p-8 text-center">
          <p className="text-sm text-zinc-300">{t("noProductsMatch")}</p>
          <button type="button" onClick={reset} className="hagor-btn-outline mt-4 text-sm">
            {t("resetFilters")}
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Link href="/products" className="hagor-btn-outline">
          {t("viewAllProducts")}
        </Link>
      </div>
    </section>
  );
}
