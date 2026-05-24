"use client";

import { useMemo, useState } from "react";
import { AssetImg } from "@/components/asset-img";
import { useCart } from "@/components/cart-context";
import { pickLocalized } from "@/lib/localized";
import { HagourCheckIcon, HagourNavIcon } from "@/components/storefront/hagour-icon";
import { useStoreI18n } from "@/components/storefront/store-i18n";

type RelatedProduct = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  price: number;
  stock: number;
  image: string | null;
};

export function RelatedProductsModal({
  open,
  onClose,
  main,
  mainDisplay,
  related,
}: {
  open: boolean;
  onClose: () => void;
  main: { productId: string; qty: number; optionIds: string[]; title: string };
  mainDisplay?: { image: string | null; price: number };
  related: RelatedProduct[];
}) {
  const { addItem } = useCart();
  const { lang, dir } = useStoreI18n();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const items = useMemo(() => related.filter((p) => p.stock > 0), [related]);

  if (!open) return null;

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const addAll = () => {
    addItem(main.productId, main.qty, main.optionIds);
    for (const p of items) {
      if (selected[p.id]) addItem(p.id, 1, []);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />
      <div
        dir={dir}
        className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-xl rounded-t-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl md:inset-y-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black text-white">השלם את הקנייה שלך</div>
            <div className="mt-1 text-sm text-zinc-400">לקוחות קונים גם את המוצרים האלו</div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200" aria-label="close">
            <HagourNavIcon name="close" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-300">המוצר הראשי</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <AssetImg path={mainDisplay?.image ?? null} alt={main.title} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{main.title}</div>
              {mainDisplay ? <div className="mt-0.5 text-sm text-hagor-gold">₪{mainDisplay.price.toFixed(2)}</div> : null}
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-hagor-gold/40 bg-hagor-gold/15 text-hagor-gold" aria-hidden>
              <HagourCheckIcon />
            </div>
          </div>
        </div>

        <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1 md:max-h-[60vh]">
          {items.map((p) => {
            const checked = !!selected[p.id];
            const name = pickLocalized(p, "name", lang);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition ${
                  checked
                    ? "border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(37,99,235,0.25)]"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-blue-500/50"
                }`}
              >
                <div className="h-12 w-12 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                  <AssetImg path={p.image} alt={name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{name}</div>
                  <div className="mt-0.5 text-sm text-hagor-gold">₪{p.price.toFixed(2)}</div>
                </div>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                    checked ? "border-hagor-gold/40 bg-hagor-gold/15 text-hagor-gold" : "border-zinc-700 text-zinc-500"
                  }`}
                  aria-hidden
                >
                  {checked ? <HagourCheckIcon /> : null}
                </div>
              </button>
            );
          })}
          {items.length === 0 && <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">אין מוצרים משלימים זמינים.</div>}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={addAll}
            className="rounded-2xl bg-gradient-to-r from-hagor-gold to-amber-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5"
          >
            הוסף לסל והמשך
          </button>
          <button
            type="button"
            onClick={() => {
              addItem(main.productId, main.qty, main.optionIds);
              onClose();
            }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
          >
            דלג
          </button>
        </div>
      </div>
    </>
  );
}

