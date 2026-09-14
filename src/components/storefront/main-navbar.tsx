"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { MobileMenu } from "@/components/storefront/mobile-menu";
import { CategoriesNav } from "@/components/storefront/categories-nav";
import { BRAND_DISPLAY } from "@/lib/hero";
import { filterHagourCategories } from "@/lib/hagour-catalog";
import { HagourNavIcon } from "@/components/storefront/hagour-icon";

type Category = { id: string; parentId: string | null; name_he: string; name_ar: string; name_en: string };

export function MainNavbar({
  categories,
  isLoggedIn,
  role,
}: {
  categories: Category[];
  isLoggedIn: boolean;
  role: UserRole | null;
}) {
  const router = useRouter();
  const { items, lastAddedAt } = useCart();
  const { t, dir } = useStoreI18n();
  const hagourCategories = useMemo(() => filterHagourCategories(categories), [categories]);

  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!lastAddedAt) return;
    setCartBounce(true);
    const id = window.setTimeout(() => setCartBounce(false), 500);
    return () => window.clearTimeout(id);
  }, [lastAddedAt]);

  useEffect(() => {
    const onOpenMenu = () => setMobileOpen(true);
    const onCloseMenu = () => setMobileOpen(false);
    window.addEventListener("hagor:open-mobile-menu", onOpenMenu);
    window.addEventListener("hagor:close-mobile-menu", onCloseMenu);
    return () => {
      window.removeEventListener("hagor:open-mobile-menu", onOpenMenu);
      window.removeEventListener("hagor:close-mobile-menu", onCloseMenu);
    };
  }, []);

  function submitSearch(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    const q = search.trim();
    setMobileSearchOpen(false);
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  }

  const shellClass = scrolled
    ? "border-b border-hagor-gold/25 bg-[#060606] shadow-lg shadow-black/40"
    : "border-b border-hagor-gold/25 bg-[#060606]";

  const rowClass = scrolled
    ? "mx-auto flex h-[70px] max-w-[1440px] items-center gap-3 px-4 md:gap-5 md:px-8 xl:px-10"
    : "mx-auto flex h-[78px] max-w-[1440px] items-center gap-3 px-4 md:h-[84px] md:gap-5 md:px-8 xl:px-10";

  const cartBtnClass = cartBounce
    ? "relative inline-flex h-10 animate-bounce items-center justify-center gap-2 rounded-lg border border-hagor-gold/25 bg-[#0d0d0d] px-2.5 text-sm font-medium text-zinc-100 transition-colors duration-150 hover:border-hagor-gold/50 hover:text-hagor-gold"
    : "relative inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-hagor-gold/25 bg-[#0d0d0d] px-2.5 text-sm font-medium text-zinc-100 transition-colors duration-150 hover:border-hagor-gold/50 hover:text-hagor-gold";

  return (
    <>
      <div className={shellClass}>
        <div dir={dir} className={rowClass}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hagor-gold/25 text-zinc-100 transition-colors duration-150 hover:text-hagor-gold lg:hidden"
            aria-label="open-menu"
          >
            <HagourNavIcon name="menu" />
          </button>

          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-hagor-gold to-amber-800 text-sm font-black text-black md:h-11 md:w-11 md:text-base">
              H
            </span>
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate text-base font-black tracking-wide text-white md:text-lg">
                {BRAND_DISPLAY}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-hagor-gold">
                Tactical
              </span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-md flex-1 md:block xl:max-w-lg">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-zinc-500">
                <HagourNavIcon name="search" />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-hagor-gold/45 bg-[#0d0d0d] pe-3 ps-10 text-sm text-white outline-none transition-colors duration-150 placeholder:text-zinc-500 focus:border-hagor-gold"
              />
            </div>
          </form>

          <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>

            <Link
              href={isLoggedIn ? "/account" : "/login"}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:text-hagor-gold md:inline-flex"
            >
              <HagourNavIcon name="heart" />
              <span className="hidden whitespace-nowrap xl:inline">{t("favorites")}</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-hagor-gold/25 text-zinc-100 transition-colors duration-150 hover:text-hagor-gold md:hidden"
              aria-label="search"
            >
              <HagourNavIcon name="search" />
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={cartBtnClass}
              aria-label={t("cartLabel")}
            >
              <HagourNavIcon name="cart" />
              <span className="hidden whitespace-nowrap md:inline">{t("cartLabel")}</span>
              {count > 0 ? (
                <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hagor-gold px-1 text-[9px] font-bold text-black">
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <Suspense fallback={<div className="hidden h-14 border-y border-hagor-gold/15 bg-[#090909] lg:block" />}>
          <CategoriesNav categories={categories} />
        </Suspense>

        <MobileMenu
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          categories={hagourCategories}
          isLoggedIn={isLoggedIn}
          role={role}
        />
      </div>

      {mobileSearchOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/80 p-4 md:hidden" dir={dir}>
          <form onSubmit={submitSearch} className="mx-auto mt-16 flex max-w-lg gap-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-12 flex-1 rounded-xl border border-hagor-gold/45 bg-[#0d0d0d] px-4 text-base text-white outline-none placeholder:text-zinc-500"
            />
            <button type="submit" className="hagor-btn px-4">
              <HagourNavIcon name="search" />
            </button>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 text-white"
              aria-label="close"
            >
              <HagourNavIcon name="close" />
            </button>
          </form>
        </div>
      ) : null}

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
