"use client";

import Link from "next/link";
import { AssetImg } from "@/components/asset-img";
import { QuickAddToCartButton } from "@/components/storefront/quick-add-to-cart-button";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";

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
};

export function ProductCard({ product }: { product: StoreProductCardData }) {
  const { lang, t } = useStoreI18n();
  const title = pickLocalized(product, "name", lang);
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-[#111827] p-2.5 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.7)] transition hover:border-orange-500/40 active:scale-[0.99] md:p-3">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
          <div className="aspect-square">
            <AssetImg
              path={product.image}
              alt={title}
              className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.03]"
            />
          </div>
          {product.discountPercent ? (
            <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white">
              -{product.discountPercent}%
            </span>
          ) : null}
        </div>
      </Link>
      <div className="mt-2.5 flex flex-1 flex-col gap-2">
        <Link href={`/products/${product.id}`} className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-snug text-zinc-100 hover:text-orange-300 md:text-sm">
          {title}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-orange-400 md:text-lg">₪{product.price.toFixed(2)}</span>
          {product.oldPrice ? (
            <span className="text-sm text-zinc-500 line-through">₪{product.oldPrice.toFixed(2)}</span>
          ) : null}
        </div>
        <p className={`text-[11px] ${product.stock > 0 ? "text-emerald-400/90" : "text-red-400/90"}`}>
          {product.stock > 0 ? t("inStock") : t("outOfStock")}
        </p>
        <div className="mt-auto">
          <QuickAddToCartButton
            disabled={product.stock <= 0}
            product={{
              id: product.id,
              title,
              price: product.price,
              image: product.image,
              stock: product.stock,
            }}
          />
        </div>
      </div>
    </article>
  );
}
