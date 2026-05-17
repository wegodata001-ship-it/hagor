"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import { AssetImg } from "@/components/asset-img";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";

type ProductRow = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  price: number;
  stock: number;
  image: string | null;
};

export default function CartPage() {
  const { items, setQuantity, removeItem } = useCart();
  const { t, lang, dir } = useStoreI18n();
  const [products, setProducts] = useState<Record<string, ProductRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      setProducts({});
      setLoading(false);
      return;
    }
    const ids = Array.from(new Set(items.map((i) => i.productId)));
    fetch(`/api/products/bulk?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data: { products: ProductRow[] }) => {
        const map: Record<string, ProductRow> = {};
        for (const p of data.products) map[p.id] = p;
        setProducts(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [items]);

  let subtotal = 0;
  for (const line of items) {
    const p = products[line.productId];
    if (p) subtotal += p.price * line.quantity;
  }

  return (
    <div dir={dir} className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-black text-white">{t("cart")}</h1>
      {loading && <p className="mt-6 text-zinc-500">טוען…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-6 text-zinc-400">
          {t("emptyCart")}{" "}
          <Link href="/products" className="text-hagor-gold hover:underline">
            לקטלוג
          </Link>
        </p>
      )}
      <ul className="mt-6 space-y-4">
        {items.map((line) => {
          const p = products[line.productId];
          if (!p) return null;
          const lineTotal = p.price * line.quantity;
          return (
            <li
              key={line.key}
              className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                <AssetImg path={p.image} alt={pickLocalized(p, "name", lang)} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-100">{pickLocalized(p, "name", lang)}</div>
                <div className="mt-1 text-sm text-zinc-400">
                  ₪{p.price.toFixed(2)} × {line.quantity} = ₪{lineTotal.toFixed(2)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-sm text-zinc-400">
                    כמות{" "}
                    <input
                      type="number"
                      min={1}
                      max={p.stock}
                      value={line.quantity}
                      onChange={(e) =>
                        setQuantity(line.key, Math.min(p.stock, Math.max(1, Number(e.target.value) || 1)))
                      }
                      className="ml-1 w-16 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                    />
                  </label>
                  <button
                    type="button"
                    className="text-sm text-red-400 hover:underline"
                    onClick={() => removeItem(line.key)}
                  >
                    הסר
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {items.length > 0 && (
        <div className="mt-8 flex items-center justify-between border-t border-zinc-800 pt-6">
          <span className="text-lg font-semibold text-zinc-100">
            {t("subtotal")}: ₪{subtotal.toFixed(2)}
          </span>
          <Link
            href="/checkout"
            className="rounded-xl bg-gradient-to-r from-hagor-gold to-amber-700 px-6 py-3 font-medium text-white"
          >
            {t("checkout")}
          </Link>
        </div>
      )}
    </div>
  );
}
