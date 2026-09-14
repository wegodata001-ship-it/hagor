"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { filterHagourCategories } from "@/lib/hagour-catalog";
import { pickLocalized } from "@/lib/localized";

type Category = { id: string; parentId: string | null; name_he: string; name_ar: string; name_en: string };

export function CategoriesNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, lang, dir } = useStoreI18n();
  const hagourCategories = useMemo(() => filterHagourCategories(categories), [categories]);
  const activeCat = searchParams.get("cat") ?? "";

  const links = useMemo(
    () => [
      { href: "/", label: t("navHome"), key: "home", kind: "home" as const },
      ...hagourCategories.map((c) => ({
        href: `/products?cat=${encodeURIComponent(c.id)}`,
        label: pickLocalized(c, "name", lang),
        key: c.id,
        kind: "cat" as const,
        id: c.id,
      })),
      { href: "/#about", label: t("navAbout"), key: "about", kind: "static" as const },
      { href: "/#contact", label: t("heroContact"), key: "contact", kind: "static" as const },
    ],
    [hagourCategories, lang, t],
  );

  function isActive(link: (typeof links)[number]) {
    if (link.kind === "home") return pathname === "/";
    if (link.kind === "cat") return pathname.startsWith("/products") && activeCat === link.id;
    return false;
  }

  return (
    <div className="hidden border-y border-hagor-gold/20 bg-[#090909] lg:block">
      <nav
        dir={dir}
        className="mx-auto flex h-[52px] max-w-[1440px] items-center gap-7 overflow-x-auto px-4 md:h-14 md:gap-8 md:px-8 xl:px-10"
        aria-label="Categories"
      >
        {links.map((link) => {
          const active = isActive(link);
          return (
            <Link
              key={link.key}
              href={link.href}
              className={
                active
                  ? "relative shrink-0 whitespace-nowrap py-3 text-sm font-medium text-hagor-gold"
                  : "relative shrink-0 whitespace-nowrap py-3 text-sm font-medium text-zinc-300 transition-colors duration-150 hover:text-hagor-gold"
              }
            >
              {link.label}
              {active ? <span className="absolute inset-x-0 bottom-0 h-px bg-hagor-gold" aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
