"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { ProductGrid } from "@/components/storefront/product-grid";
import { pickLocalized } from "@/lib/localized";
import type { StoreProductCardData } from "@/components/storefront/product-card";

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
  const mains = categories.filter((c) => c.parentId == null);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    return map;
  }, [categories]);
  const selected = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null;
  const initialOpen =
    selected && selected.parentId
      ? selected.parentId
      : selected && (childrenByParent.get(selected.id)?.length ?? 0) > 0
        ? selected.id
        : null;
  const [openMain, setOpenMain] = useState<string | null>(initialOpen);
  return (
    <div dir={dir} className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/products" className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-xs text-zinc-200">
          כל המוצרים
        </Link>
        {mains.map((c) => {
          const children = childrenByParent.get(c.id) ?? [];
          const isActiveMain = selected?.id === c.id;
          if (children.length === 0) {
            return (
              <Link
                key={c.id}
                href={`/products?cat=${encodeURIComponent(c.id)}`}
                className={`rounded-full border px-4 py-1.5 text-xs ${
                  isActiveMain ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-zinc-700 bg-zinc-900 text-zinc-300"
                }`}
              >
                {pickLocalized(c, "name", lang)}
              </Link>
            );
          }
          const expanded = openMain === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenMain((prev) => (prev === c.id ? null : c.id))}
              className={`rounded-full border px-4 py-1.5 text-xs ${
                expanded || isActiveMain
                  ? "border-orange-500 bg-orange-500/20 text-orange-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
              }`}
            >
              {pickLocalized(c, "name", lang)} ▼
            </button>
          );
        })}
      </div>
      {openMain && (childrenByParent.get(openMain)?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 transition-all">
          <div className="flex flex-wrap gap-2">
            {(childrenByParent.get(openMain) ?? []).map((child) => (
              <Link
                key={child.id}
                href={`/products?cat=${encodeURIComponent(child.id)}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selected?.id === child.id
                    ? "border-orange-500 bg-orange-500/20 text-orange-300"
                    : "border-zinc-700 text-zinc-300 hover:border-orange-500/70 hover:text-orange-300"
                }`}
              >
                {pickLocalized(child, "name", lang)}
              </Link>
            ))}
          </div>
        </div>
      )}
      <ProductGrid title="קטלוג מוצרים" products={products} />
    </div>
  );
}
