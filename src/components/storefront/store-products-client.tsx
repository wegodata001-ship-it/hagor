"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { ProductGrid } from "@/components/storefront/product-grid";
import { pickLocalized } from "@/lib/localized";
import type { StoreProductCardData } from "@/components/storefront/product-card";
import { CategoryAccordion } from "@/components/storefront/category-accordion";
import { SubcategoryPillLink } from "@/components/storefront/subcategory-pill-link";
import { ProductFilters } from "@/components/storefront/product-filters";

type Category = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
  imageUrl?: string | null;
};

export function StoreProductsClient({
  categories,
  selectedCategoryId,
  products,
  priceMin,
  priceMax,
}: {
  categories: Category[];
  selectedCategoryId: string;
  products: StoreProductCardData[];
  priceMin: number;
  priceMax: number;
}) {
  const { lang, dir } = useStoreI18n();
  const selected = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null;

  const subcategoryChips = useMemo(() => {
    if (!selected) return [];
    if (!selected.parentId) {
      const subs = categories.filter((c) => c.parentId === selected.id);
      return subs.length ? subs : [];
    }
    return categories.filter((c) => c.parentId === selected.parentId);
  }, [categories, selected]);

  return (
    <div dir={dir} className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <ProductFilters categories={categories} priceMin={priceMin} priceMax={priceMax} />
          <div className="mb-3 mt-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-hagor-gold/85">Browse</div>
              <div className="text-lg font-bold text-white">קטגוריות</div>
            </div>
            <Link
              href="/products"
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-hagor-gold/50"
            >
              כל המוצרים
            </Link>
          </div>
          <CategoryAccordion
            variant="dark"
            categories={categories}
            selectedId={selected?.id ?? undefined}
            hrefForId={(id) => `/products?cat=${encodeURIComponent(id)}`}
            className="space-y-2"
          />
        </aside>

        <div className="space-y-6">
          {subcategoryChips.length > 0 && (
            <div className="flex flex-wrap gap-2.5 gap-y-3">
              {subcategoryChips.map((c) => (
                <SubcategoryPillLink
                  key={c.id}
                  href={`/products?cat=${encodeURIComponent(c.id)}`}
                  label={pickLocalized(c, "name", lang)}
                  imageUrl={c.imageUrl}
                  active={selectedCategoryId === c.id}
                />
              ))}
            </div>
          )}
          <div className="text-sm text-zinc-400">
            {selected ? (
              <>
                מציגים: <span className="font-semibold text-zinc-100">{pickLocalized(selected, "name", lang)}</span>
              </>
            ) : (
              "כל המוצרים"
            )}
          </div>
          <ProductGrid title="קטלוג מוצרים" products={products} />
        </div>
      </div>
    </div>
  );
}
