"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";

type ProductDetails = {
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
  category: { name_he: string; name_ar: string; name_en: string };
  images: { id: string; url: string }[];
};

export function StoreProductDetailClient({ product }: { product: ProductDetails }) {
  const { lang, dir } = useStoreI18n();
  const [qty, setQty] = useState(1);
  const title = pickLocalized(product, "name", lang);
  const desc = pickLocalized(product, "description", lang);
  const specs = useMemo(
    () =>
      [
        `מק״ט: ${product.id.slice(0, 8).toUpperCase()}`,
        `קטגוריה: ${pickLocalized(product.category, "name", lang)}`,
        product.stock > 0 ? `זמינות: במלאי` : "זמינות: אזל מהמלאי",
      ],
    [product.id, product.category, product.stock, lang],
  );
  return (
    <div dir={dir} className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-8">
      <Link href="/products" className="text-sm text-orange-400 hover:underline">
        ← חזרה למוצרים
      </Link>
      <div className="mt-6 grid gap-8 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 md:grid-cols-2 md:p-8">
        <div>
          <ProductGallery title={title} images={product.images} />
        </div>
        <div>
          <p className="text-sm text-zinc-400">{pickLocalized(product.category, "name", lang)}</p>
          <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-orange-400">₪{product.price.toFixed(2)}</span>
            {product.oldPrice ? (
              <span className="text-xl text-zinc-500 line-through">₪{product.oldPrice.toFixed(2)}</span>
            ) : null}
          </div>
          {product.discountPercent ? (
            <div className="mt-3 inline-block rounded-full bg-orange-500/20 px-3 py-1 text-xs text-orange-300">
              הנחה {product.discountPercent}%
            </div>
          ) : null}
          {desc && <p className="mt-6 leading-relaxed text-zinc-300">{desc}</p>}
          <p className={`mt-4 text-sm ${product.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {product.stock > 0 ? `במלאי (${product.stock})` : "אזל מהמלאי"}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-zinc-400">כמות</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded border border-zinc-700"
            >
              -
            </button>
            <span className="w-8 text-center text-zinc-100">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
              className="h-8 w-8 rounded border border-zinc-700"
            >
              +
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-zinc-300 md:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-center">🚚 משלוח מהיר</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-center">🛡️ אחריות יבואן</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-center">🔒 תשלום מאובטח</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-center">🎧 שירות לקוחות</div>
          </div>
          <div className="mt-8">
            <AddToCartButton productId={product.id} qty={qty} disabled={product.stock <= 0} />
          </div>
        </div>
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:col-span-2">
          <h3 className="text-lg font-semibold text-white">תיאור המוצר</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{desc || "אין תיאור זמין למוצר זה."}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-lg font-semibold text-white">מפרט</h3>
          <ul className="mt-2 space-y-2 text-sm text-zinc-300">
            {specs.map((s) => (
              <li key={s} className="rounded border border-zinc-800 bg-zinc-950/70 px-2 py-1">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:col-span-3">
          <h3 className="text-lg font-semibold text-white">משלוח ואחריות</h3>
          <p className="mt-2 text-sm text-zinc-300">
            משלוח מהיר לכל הארץ, איסוף עצמי לפי זמינות. אחריות יצרן/יבואן בהתאם לקטגוריה.
          </p>
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 p-3 md:hidden">
        <AddToCartButton productId={product.id} qty={qty} disabled={product.stock <= 0} />
      </div>
    </div>
  );
}
