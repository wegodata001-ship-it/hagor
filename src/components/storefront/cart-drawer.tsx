"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AssetImg } from "@/components/asset-img";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { formatSelectedOptionsLines } from "@/lib/hagour-product-options";
import { pickLocalized } from "@/lib/localized";
import { HagourNavIcon } from "@/components/storefront/hagour-icon";

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
  const [freeShippingMin, setFreeShippingMin] = useState(499);

  useEffect(() => {
    fetch("/api/store/public")
      .then((r) => r.json())
      .then((d: { freeShippingMinAmount?: number }) => {
        if (d.freeShippingMinAmount && d.freeShippingMinAmount > 0) setFreeShippingMin(d.freeShippingMinAmount);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setProducts({});
      return;
    }
    const ids = Array.from(new Set(items.map((i) => i.productId))).join(",");
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
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300" aria-label="close">
            <HagourNavIcon name="close" />
          </button>
        </div>
        <div className="h-[calc(100vh-180px)] space-y-3 overflow-y-auto pr-1">
          {items.length === 0 && <p className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-400">{t("emptyCart")}</p>}
          {items.map((line) => {
            const p = products[line.productId];
            if (!p) return null;
            const name = pickLocalized(p, "name", lang);
            return (
              <div key={line.key} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                <div className="flex gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                    <AssetImg path={p.image} alt={name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    {line.selectedOptions
                      ? formatSelectedOptionsLines(line.selectedOptions, lang).map((row) => (
                          <p key={row} className="text-xs text-zinc-400">
                            {row}
                          </p>
                        ))
                      : null}
                    <p className="text-sm text-hagor-gold">₪{p.price.toFixed(2)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.key, Math.max(1, line.quantity - 1))}
                        className="h-7 w-7 rounded border border-zinc-700 text-zinc-200"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.key, Math.min(p.stock, line.quantity + 1))}
                        className="h-7 w-7 rounded border border-zinc-700 text-zinc-200"
                      >
                        +
                      </button>
                      <button type="button" onClick={() => removeItem(line.key)} className="ml-auto text-xs text-red-400">
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
          {freeShippingMin > 0 && subtotal < freeShippingMin ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{t("freeShipping")}</span>
                <span>₪{(freeShippingMin - subtotal).toFixed(0)} נותר</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-hagor-gold transition-all"
                  style={{ width: `${Math.min(100, (subtotal / freeShippingMin) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-zinc-300">{t("subtotal")}</span>
            <strong className="text-hagor-gold">₪{subtotal.toFixed(2)}</strong>
          </div>
          <Link
            href="/checkout"
            onClick={onClose}
            className="hagor-btn block w-full text-center"
          >
            {t("checkout")}
          </Link>
        </div>
      </aside>
    </>
  );
}
