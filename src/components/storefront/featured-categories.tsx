"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AssetImg } from "@/components/asset-img";
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

const PRIORITY_EN = ["Smartphones", "Laptops", "Gaming", "Audio", "Cables"];

function sortMainCategories(mains: CategoryItem[]): CategoryItem[] {
  const index = (name: string) => {
    const i = PRIORITY_EN.findIndex((p) => p.toLowerCase() === name.toLowerCase());
    return i === -1 ? 999 : i;
  };
  return [...mains].sort((a, b) => index(a.name_en) - index(b.name_en));
}

export function FeaturedCategories({ categories }: { categories: CategoryItem[] }) {
  const { lang, t, dir } = useStoreI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [openMain, setOpenMain] = useState<string | null>(null);

  const mains = useMemo(() => sortMainCategories(categories.filter((c) => c.parentId == null)), [categories]);
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

  const scroll = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <section id="featured-categories" className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-center sm:flex-none sm:text-start">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-400/85">{t("featuredCategoriesKicker")}</p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-white sm:text-lg">{t("featuredCategoriesTitle")}</h2>
        </div>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => scroll(dir === "rtl" ? 200 : -200)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700/90 bg-zinc-900/90 text-base leading-none text-zinc-200 shadow-[0_0_16px_-4px_rgba(249,115,22,0.25)] transition hover:border-orange-500/60 hover:text-orange-300 hover:shadow-[0_0_20px_-2px_rgba(249,115,22,0.4)] sm:h-9 sm:w-9 sm:text-lg"
            aria-label="scroll-prev"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll(dir === "rtl" ? -200 : 200)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700/90 bg-zinc-900/90 text-base leading-none text-zinc-200 shadow-[0_0_16px_-4px_rgba(249,115,22,0.25)] transition hover:border-orange-500/60 hover:text-orange-300 hover:shadow-[0_0_20px_-2px_rgba(249,115,22,0.4)] sm:h-9 sm:w-9 sm:text-lg"
            aria-label="scroll-next"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex justify-center gap-5 overflow-x-auto px-1 py-1 sm:justify-start sm:gap-6 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
          {mains.map((c) => {
            const children = childrenByParent.get(c.id) ?? [];
            const hasChildren = children.length > 0;
            const expanded = openMain === c.id;
            const label = pickLocalized(c, "name", lang);

            const item = (
              <div className="flex w-[76px] shrink-0 flex-col items-center sm:w-[88px]">
                <div
                  className={`relative rounded-full p-[2.5px] transition duration-300 ease-out ${
                    expanded
                      ? "scale-[1.02] shadow-[0_0_28px_2px_rgba(249,115,22,0.5)]"
                      : "shadow-[0_0_18px_-2px_rgba(249,115,22,0.35)] group-hover:shadow-[0_0_26px_4px_rgba(249,115,22,0.48)]"
                  } bg-gradient-to-br from-orange-400/90 via-orange-500/75 to-orange-600/50 group-hover:from-orange-300 group-hover:via-orange-400 group-hover:to-orange-500/70`}
                >
                  <div className="h-[64px] w-[64px] overflow-hidden rounded-full bg-zinc-950 ring-1 ring-zinc-800/90 sm:h-[72px] sm:w-[72px]">
                    <AssetImg
                      path={c.imageUrl}
                      alt={label}
                      className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-110"
                    />
                  </div>
                </div>
                <p className="mt-2 max-w-[76px] text-center text-[10px] font-medium leading-snug text-zinc-400 transition group-hover:text-zinc-200 sm:max-w-[88px] sm:text-[11px]">
                  {label}
                </p>
                {hasChildren ? (
                  <span className="mt-0.5 text-[9px] text-orange-400/90">{expanded ? "▲" : "▼"}</span>
                ) : null}
              </div>
            );

            const wrapClass = "group block shrink-0 text-center transition duration-300 hover:-translate-y-0.5";

            if (!hasChildren) {
              return (
                <Link key={c.id} href={`/products?cat=${encodeURIComponent(c.id)}`} className={wrapClass}>
                  {item}
                </Link>
              );
            }

            return (
              <button key={c.id} type="button" onClick={() => setOpenMain((prev) => (prev === c.id ? null : c.id))} className={`${wrapClass} cursor-pointer border-0 bg-transparent p-0`}>
                {item}
              </button>
            );
          })}
      </div>

      {openMain && (childrenByParent.get(openMain)?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-zinc-800/50 pt-3">
          <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:text-start">{t("subcategoriesLabel")}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {(childrenByParent.get(openMain) ?? []).map((child) => (
              <Link
                key={child.id}
                href={`/products?cat=${encodeURIComponent(child.id)}`}
                className="rounded-full border border-zinc-700/80 bg-zinc-900/40 px-3 py-1 text-[11px] text-zinc-300 transition hover:border-orange-500/55 hover:text-orange-300"
              >
                {pickLocalized(child, "name", lang)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
