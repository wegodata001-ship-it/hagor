"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AssetImg } from "@/components/asset-img";
import { SubcategoryPillLink } from "@/components/storefront/subcategory-pill-link";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";

type CategoryItem = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
  imageUrl: string | null;
};

export function CategoryCarousel({ categories }: { categories: CategoryItem[] }) {
  const { lang, t } = useStoreI18n();
  const searchParams = useSearchParams();
  const selectedCatId = searchParams.get("cat")?.trim() ?? "";
  const scroller = useRef<HTMLDivElement>(null);
  const [openMain, setOpenMain] = useState<string | null>(null);
  const mains = useMemo(() => categories.filter((c) => c.parentId == null), [categories]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, CategoryItem[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    return map;
  }, [categories]);
  const scroll = (amount: number) => scroller.current?.scrollBy({ left: amount, behavior: "smooth" });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">{t("topCategories")}</h2>
        <div className="hidden gap-2 md:flex">
          <button onClick={() => scroll(-260)} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:border-hagor-gold">
            ‹
          </button>
          <button onClick={() => scroll(260)} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:border-hagor-gold">
            ›
          </button>
        </div>
      </div>
      <div ref={scroller} className="flex gap-3 overflow-x-auto pb-2">
        {mains.map((c) => {
          const children = childrenByParent.get(c.id) ?? [];
          const hasChildren = children.length > 0;
          const expanded = openMain === c.id;
          const card = (
            <div className="group min-w-[130px] flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-center shadow-lg shadow-black/20 transition hover:border-hagor-gold/50">
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-hagor-gold/70 bg-zinc-950">
                <AssetImg path={c.imageUrl} alt={pickLocalized(c, "name", lang)} className="h-full w-full object-cover transition group-hover:scale-110" />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-200">{pickLocalized(c, "name", lang)}</p>
              {hasChildren ? (
                <p className="mt-1 text-[10px] text-hagor-gold/80">{expanded ? "▲" : "▼"}</p>
              ) : null}
            </div>
          );
          if (!hasChildren) {
            return (
              <Link key={c.id} href={`/products?cat=${encodeURIComponent(c.id)}`}>
                {card}
              </Link>
            );
          }
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenMain((prev) => (prev === c.id ? null : c.id))}
              className="text-start"
            >
              {card}
            </button>
          );
        })}
      </div>
      {openMain && (childrenByParent.get(openMain)?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/85 p-3 transition-all sm:p-4">
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {(childrenByParent.get(openMain) ?? []).map((child) => (
              <SubcategoryPillLink
                key={child.id}
                href={`/products?cat=${encodeURIComponent(child.id)}`}
                label={pickLocalized(child, "name", lang)}
                imageUrl={child.imageUrl}
                active={selectedCatId === child.id}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
