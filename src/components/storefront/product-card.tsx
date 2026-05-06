"use client";

import Link from "next/link";
import { AssetImg } from "@/components/asset-img";
import { AddToCartButton } from "@/components/add-to-cart-button";
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
    <article className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-orange-900/20">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <div className="aspect-[4/5]">
            <AssetImg
              path={product.image}
              alt={title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
          {product.discountPercent ? (
            <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white">
              -{product.discountPercent}%
            </span>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 flex flex-1 flex-col space-y-2">
        <Link href={`/products/${product.id}`} className="line-clamp-2 min-h-11 text-sm font-semibold text-zinc-100 hover:text-orange-300">
          {title}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-orange-400">₪{product.price.toFixed(2)}</span>
          {product.oldPrice ? (
            <span className="text-sm text-zinc-500 line-through">₪{product.oldPrice.toFixed(2)}</span>
          ) : null}
        </div>
        <p className={`text-xs ${product.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {product.stock > 0 ? `${t("inStock")} · ${t("stock")}: ${product.stock}` : t("outOfStock")}
        </p>
        <div className="mt-auto">
          <AddToCartButton productId={product.id} disabled={product.stock <= 0} />
        </div>
      </div>
    </article>
  );
}
