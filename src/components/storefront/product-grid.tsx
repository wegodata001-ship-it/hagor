"use client";

import { ProductCard, type StoreProductCardData } from "@/components/storefront/product-card";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export function ProductGrid({ title, products }: { title?: string; products: StoreProductCardData[] }) {
  const { t } = useStoreI18n();
  return (
    <section className="space-y-4">
      {title && <h2 className="text-2xl font-black text-white">{title}</h2>}
      {products.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">אין מוצרים להצגה</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-500">{t("hotDeals")}</p>
    </section>
  );
}
