"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AssetImg } from "@/components/asset-img";
import { useCart } from "@/components/cart-context";
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

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, setQuantity, removeItem } = useCart();
  const { t, lang, dir } = useStoreI18n();
  const [products, setProducts] = useState<Record<string, ProductRow>>({});

  useEffect(() => {
    if (items.length === 0) {
      setProducts({});
      return;
    }
    const ids = items.map((i) => i.productId).join(",");
    fetch(`/api/products/bulk?ids=${ids}`)
      .then((r) => r.json())
      .then((d: { products: ProductRow[] }) => {
        const map: Record<string, ProductRow> = {};
        for (const p of d.products) map[p.id] = p;
        setProducts(map);
      })
      .catch(() => setProducts({}));
  }, [items]);

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const it of items) {
      const p = products[it.productId];
      if (p) sum += p.price * it.quantity;
    }
    return sum;
  }, [items, products]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        dir={dir}
        className={`fixed bottom-0 top-0 z-50 w-full max-w-md border-zinc-800 bg-zinc-950 p-4 text-white shadow-2xl transition-transform md:w-[420px] ${
          open ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"
        } ${dir === "rtl" ? "right-0 border-l" : "left-0 border-r"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("cart")}</h3>
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-300">
            ✕
          </button>
        </div>
        <div className="h-[calc(100vh-180px)] space-y-3 overflow-y-auto pr-1">
          {items.length === 0 && <p className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-400">{t("emptyCart")}</p>}
          {items.map((line) => {
            const p = products[line.productId];
            if (!p) return null;
            const name = pickLocalized(p, "name", lang);
            return (
              <div key={line.productId} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                <div className="flex gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                    <AssetImg path={p.image} alt={name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-sm text-orange-400">₪{p.price.toFixed(2)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, Math.max(1, line.quantity - 1))}
                        className="h-7 w-7 rounded border border-zinc-700 text-zinc-200"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, Math.min(p.stock, line.quantity + 1))}
                        className="h-7 w-7 rounded border border-zinc-700 text-zinc-200"
                      >
                        +
                      </button>
                      <button type="button" onClick={() => removeItem(line.productId)} className="ml-auto text-xs text-red-400">
                        הסר
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300">{t("subtotal")}</span>
            <strong className="text-orange-400">₪{subtotal.toFixed(2)}</strong>
          </div>
          <Link
            href="/checkout"
            onClick={onClose}
            className="block rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-center font-semibold text-white shadow-lg shadow-orange-700/20"
          >
            {t("checkout")}
          </Link>
        </div>
      </aside>
    </>
  );
}
