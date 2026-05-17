"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import { RelatedProductsModal } from "@/components/storefront/related-products-modal";

type VariantOption = {
  id: string;
  value: string;
  priceAdd: number;
  stock: number | null;
  sku: string | null;
  image: string | null;
  isDefault: boolean;
  sortOrder: number;
};
type VariantGroup = { id: string; name: string; sortOrder: number; options: VariantOption[] };

type RelatedProduct = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  price: number;
  stock: number;
  image: string | null;
};

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
  variantGroups: VariantGroup[];
  relatedProducts: RelatedProduct[];
};

export function StoreProductDetailClient({ product }: { product: ProductDetails }) {
  const { lang, dir } = useStoreI18n();
  const [qty, setQty] = useState(1);
  const [crossSellOpen, setCrossSellOpen] = useState(false);
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of product.variantGroups ?? []) {
      const def = g.options.find((o) => o.isDefault) ?? g.options[0];
      if (def) init[g.id] = def.id;
    }
    return init;
  });
  const title = pickLocalized(product, "name", lang);
  const desc = pickLocalized(product, "description", lang);
  const selectedOptionIds = useMemo(() => Object.values(selectedByGroup).filter(Boolean), [selectedByGroup]);
  const selectedOptions = useMemo(() => {
    const byId = new Map<string, VariantOption>();
    for (const g of product.variantGroups ?? []) for (const o of g.options ?? []) byId.set(o.id, o);
    return selectedOptionIds.map((id) => byId.get(id)).filter(Boolean) as VariantOption[];
  }, [product.variantGroups, selectedOptionIds]);
  const price = useMemo(() => {
    const add = selectedOptions.reduce((s, o) => s + (Number.isFinite(o.priceAdd) ? o.priceAdd : 0), 0);
    return Math.round((product.price + add) * 100) / 100;
  }, [product.price, selectedOptions]);
  const variantHeroImage = useMemo(() => selectedOptions.find((o) => o.image)?.image ?? null, [selectedOptions]);
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
      <Link href="/products" className="text-sm text-hagor-gold hover:underline">
        ← חזרה למוצרים
      </Link>
      <div className="mt-6 grid gap-8 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 md:grid-cols-2 md:p-8">
        <div>
          <ProductGallery
            title={title}
            images={[
              ...(variantHeroImage ? [{ id: "variant", url: variantHeroImage }] : []),
              ...product.images,
            ]}
          />
        </div>
        <div className="md:sticky md:top-24 md:self-start">
          <p className="text-sm text-zinc-400">{pickLocalized(product.category, "name", lang)}</p>
          <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-hagor-gold">₪{price.toFixed(2)}</span>
            {product.oldPrice ? (
              <span className="text-xl text-zinc-500 line-through">₪{product.oldPrice.toFixed(2)}</span>
            ) : null}
          </div>
          {product.discountPercent ? (
            <div className="mt-3 inline-block rounded-full bg-hagor-gold/20 px-3 py-1 text-xs text-hagor-gold/80">
              הנחה {product.discountPercent}%
            </div>
          ) : null}
          {desc && <p className="mt-6 leading-relaxed text-zinc-300">{desc}</p>}

          {(product.variantGroups?.length ?? 0) > 0 && (
            <div className="mt-6 space-y-5">
              {product.variantGroups.map((g) => (
                <div key={g.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-100">{g.name}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((o) => {
                      const selected = selectedByGroup[g.id] === o.id;
                      const label = o.value;
                      const extra = o.priceAdd ? `+₪${Number(o.priceAdd).toFixed(0)}` : "";
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSelectedByGroup((prev) => ({ ...prev, [g.id]: o.id }))}
                          className={`rounded-xl border px-3 py-2 text-sm transition ${
                            selected
                              ? "border-blue-500 bg-blue-500/15 text-white shadow-[0_0_0_1px_rgba(37,99,235,0.25)]"
                              : "border-zinc-700 bg-zinc-950/40 text-zinc-200 hover:border-blue-500/60"
                          }`}
                        >
                          <span className="font-medium">{label}</span>
                          {extra ? <span className="ms-2 text-xs text-zinc-400">{extra}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

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
            {product.relatedProducts.length > 0 ? (
              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => setCrossSellOpen(true)}
                className="w-full rounded-xl border border-hagor-gold/40 bg-gradient-to-r from-hagor-gold to-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:shadow-orange-700/40 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400"
              >
                {product.stock <= 0 ? "אזל מהמלאי" : "הוסף לסל"}
              </button>
            ) : (
              <AddToCartButton productId={product.id} qty={qty} disabled={product.stock <= 0} optionIds={selectedOptionIds} />
            )}
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
        {product.relatedProducts.length > 0 ? (
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => setCrossSellOpen(true)}
            className="w-full rounded-xl border border-hagor-gold/40 bg-gradient-to-r from-hagor-gold to-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:shadow-orange-700/40 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400"
          >
            {product.stock <= 0 ? "אזל מהמלאי" : "הוסף לסל"}
          </button>
        ) : (
          <AddToCartButton productId={product.id} qty={qty} disabled={product.stock <= 0} optionIds={selectedOptionIds} />
        )}
      </div>

      {product.relatedProducts.length > 0 && (
        <RelatedProductsModal
          open={crossSellOpen}
          onClose={() => setCrossSellOpen(false)}
          main={{
            productId: product.id,
            qty,
            optionIds: selectedOptionIds,
            title,
          }}
          mainDisplay={{ image: product.images[0]?.url ?? null, price }}
          related={product.relatedProducts}
        />
      )}
    </div>
  );
}
