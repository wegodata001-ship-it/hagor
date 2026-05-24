"use client";

import Link from "next/link";
import { ProductCard, type StoreProductCardData } from "@/components/storefront/product-card";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export function ProductGrid({
  title,
  products,
  viewAllHref,
}: {
  title?: string;
  products: StoreProductCardData[];
  viewAllHref?: string;
}) {
  const { t } = useStoreI18n();

  return (
    <section className="w-full">
      {title ? (
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>
          {viewAllHref ? (
            <Link href={viewAllHref} className="shrink-0 text-sm font-medium text-hagor-gold hover:underline">
              {t("viewAll")}
            </Link>
          ) : null}
        </div>
      ) : null}
      {products.length === 0 ? (
        <div className="rounded-[18px] border border-zinc-800 bg-[#111] p-8 text-center text-sm text-zinc-400">{t("noProducts")}</div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
