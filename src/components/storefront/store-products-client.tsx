"use client";

import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { ProductGrid } from "@/components/storefront/product-grid";
import { pickLocalized } from "@/lib/localized";
import type { StoreProductCardData } from "@/components/storefront/product-card";
import { CategoryAccordion } from "@/components/storefront/category-accordion";

type Category = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
};

export function StoreProductsClient({
  categories,
  selectedCategoryId,
  products,
}: {
  categories: Category[];
  selectedCategoryId: string;
  products: StoreProductCardData[];
}) {
  const { lang, dir } = useStoreI18n();
  const selected = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null;
  return (
    <div dir={dir} className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-400/85">Browse</div>
              <div className="text-lg font-bold text-white">קטגוריות</div>
            </div>
            <Link
              href="/products"
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-orange-500/50"
            >
              כל המוצרים
            </Link>
          </div>
          <CategoryAccordion
            categories={categories}
            selectedId={selected?.id ?? undefined}
            hrefForId={(id) => `/products?cat=${encodeURIComponent(id)}`}
            className="space-y-2"
          />
        </aside>

        <div className="space-y-6">
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
