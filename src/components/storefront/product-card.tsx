"use client";

import Link from "next/link";
import { AssetImg } from "@/components/asset-img";
import { QuickAddToCartButton } from "@/components/storefront/quick-add-to-cart-button";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import type { TacticalPlaceholderKind } from "@/lib/tactical-placeholders";

export type StoreProductCardData = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  description_he: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  stock: number;
  image: string | null;
  categoryKey?: TacticalPlaceholderKind;
  requiresOptions?: boolean;
};

export function ProductCard({ product }: { product: StoreProductCardData }) {
  const { lang, t } = useStoreI18n();
  const title = pickLocalized(product, "name", lang);
  const kind = product.categoryKey ?? "default";

  return (
    <article className="group flex h-full min-h-[380px] flex-col overflow-hidden rounded-[18px] border border-zinc-800/90 bg-[#111111] transition duration-300 hover:border-hagor-gold/35 hover:shadow-[0_0_32px_-8px_rgba(200,146,17,0.35)]">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative h-[240px] overflow-hidden bg-[#151515]">
          <AssetImg
            path={product.image}
            alt={title}
            placeholderKind={kind}
            className="h-full w-full transition duration-500 group-hover:scale-[1.04]"
          />
          {product.discountPercent ? (
            <span className="absolute start-2 top-2 rounded-md bg-gradient-to-r from-hagor-gold to-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
              -{product.discountPercent}%
            </span>
          ) : null}
        </div>
      </Link>
      <ProductCardBody product={product} title={title} t={t} />
    </article>
  );
}

function ProductCardBody({
  product,
  title,
  t,
}: {
  product: StoreProductCardData;
  title: string;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2.5 p-3.5 md:p-4">
      <Link href={`/products/${product.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-100 transition hover:text-hagor-gold">
        {title}
      </Link>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-bold text-hagor-gold">₪{product.price.toFixed(0)}</span>
        {product.oldPrice ? (
          <span className="text-xs text-zinc-500 line-through">₪{product.oldPrice.toFixed(0)}</span>
        ) : null}
      </div>
      <p className={`text-[11px] font-medium ${product.stock > 0 ? "text-emerald-400/90" : "text-red-400/90"}`}>
        {product.stock > 0 ? t("inStock") : t("outOfStock")}
      </p>
      <div className="mt-auto pt-1">
        <QuickAddToCartButton
          disabled={product.stock <= 0}
          requiresOptions={product.requiresOptions}
          product={{
            id: product.id,
            title,
            price: product.price,
            image: product.image,
            stock: product.stock,
          }}
          compact
        />
      </div>
    </div>
  );
}
