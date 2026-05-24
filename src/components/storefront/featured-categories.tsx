"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { filterHagourCategories, hagourCategoryKeyFromId, type HagourCategoryKey } from "@/lib/hagour-catalog";
import { categorySubtitleKey, resolveCategoryBackgroundImage } from "@/lib/category-images";
import { pickLocalized } from "@/lib/localized";
import { HagourCategoryIcon, HagourDirectionArrow } from "@/components/storefront/hagour-icon";

type CategoryItem = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
  imageUrl: string | null;
};

export function FeaturedCategories({ categories }: { categories: CategoryItem[] }) {
  const { lang, t, dir } = useStoreI18n();
  const mains = useMemo(() => filterHagourCategories(categories), [categories]);

  return (
    <section id="featured-categories" className="scroll-mt-28">
      <div className="mx-auto mb-8 max-w-[1280px] px-4 text-center sm:text-start">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-hagor-gold/85">
          {t("featuredCategoriesKicker")}
        </p>
        <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{t("featuredCategoriesTitle")}</h2>
      </div>

      <div className="hagour-categories-grid">
        {mains.map((c) => {
          const key = hagourCategoryKeyFromId(c.id);
          if (!key) return null;
          return (
            <CategoryLuxuryCard
              key={c.id}
              categoryKey={key}
              href={`/products?cat=${encodeURIComponent(c.id)}`}
              title={pickLocalized(c, "name", lang)}
              subtitle={t(categorySubtitleKey(key))}
              imageUrl={c.imageUrl}
              linkLabel={t("viewAllProducts")}
              dir={dir}
            />
          );
        })}
      </div>
    </section>
  );
}

function CategoryLuxuryCard({
  categoryKey,
  href,
  title,
  subtitle,
  imageUrl,
  linkLabel,
  dir,
}: {
  categoryKey: HagourCategoryKey;
  href: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  linkLabel: string;
  dir: "rtl" | "ltr";
}) {
  const bg = resolveCategoryBackgroundImage(categoryKey, imageUrl);

  return (
    <Link
      href={href}
      className="hagour-category-card group"
      style={{ backgroundImage: `url("${bg}")` }}
      dir={dir}
    >
      <div className="hagour-category-content">
        <span className="hagour-category-icon hagour-icon-bg" aria-hidden>
          <HagourCategoryIcon categoryKey={categoryKey} />
        </span>
        <h3 className="hagour-category-title">{title}</h3>
        <p className="hagour-category-subtitle">{subtitle}</p>
        <span className="hagour-category-link inline-flex items-center gap-1.5">
          {linkLabel}
          <HagourDirectionArrow dir={dir} />
        </span>
      </div>
    </Link>
  );
}
