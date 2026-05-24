"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { MobileMenu } from "@/components/storefront/mobile-menu";
import { LogoutButton } from "@/components/logout-button";
import { BRAND_DISPLAY } from "@/lib/hero";
import { filterHagourCategories } from "@/lib/hagour-catalog";
import { pickLocalized } from "@/lib/localized";
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
  const { t, dir, lang } = useStoreI18n();
  const hagourCategories = useMemo(() => filterHagourCategories(categories), [categories]);
  const navLinks = useMemo(
    () => [
      { href: "/", label: t("navHome") },
      ...hagourCategories.map((c) => ({
        href: `/products?cat=${encodeURIComponent(c.id)}`,
        label: pickLocalized(c, "name", lang),
      })),
      { href: "/#about", label: t("navAbout") },
      { href: "/#contact", label: t("heroContact") },
    ],
    [hagourCategories, lang, t],
  );
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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

  const shellClass =
    "sticky top-0 z-40 border-b border-zinc-800/90 bg-zinc-950 transition-all duration-300 " +
    (scrolled ? "shadow-lg shadow-black/25 backdrop-blur-md" : "");

  return (
    <>
      <div className={shellClass}>
        <div className="mx-auto max-w-[1280px] px-4" dir={dir}>
          <div className="flex h-14 items-center gap-3 md:h-[58px] md:gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 text-lg text-zinc-100 md:hidden"
              aria-label="open-menu"
            >
              <HagourNavIcon name="menu" />
            </button>

            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-hagor-gold to-amber-800 text-xs font-black text-black">
                H
              </span>
              <span className="hidden text-sm font-black tracking-wide text-white sm:inline md:text-base">{BRAND_DISPLAY}</span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800/60 hover:text-hagor-gold"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
              }}
              className="hidden max-w-xs flex-1 lg:block xl:max-w-sm"
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-9 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-hagor-gold/50 focus:ring-1 focus:ring-hagor-gold/30"
              />
            </form>

            <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="hidden rounded-lg border border-zinc-700/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-hagor-gold/40 hover:text-hagor-gold md:inline-block"
                >
                  {t("loginRegister")}
                </Link>
              ) : (
                <details className="relative hidden md:block">
                  <summary className="cursor-pointer list-none rounded-lg border border-zinc-700/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-hagor-gold">
                    {t("myAccount")}
                  </summary>
                  <div className="absolute end-0 mt-2 w-44 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
                    <Link href="/account/orders" className="block rounded px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800">
                      {t("myOrders")}
                    </Link>
                    <Link href="/account/loyalty" className="block rounded px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800">
                      {t("myPoints")}
                    </Link>
                    <div className="mt-1 rounded px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800">
                      <LogoutButton label={t("logout")} />
                    </div>
                  </div>
                </details>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={`relative inline-flex h-9 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-2.5 text-sm text-zinc-100 hover:border-hagor-gold/40 hover:text-hagor-gold ${cartBounce ? "animate-bounce" : ""}`}
                aria-label="open-cart"
              >
                <HagourNavIcon name="cart" />
                {count > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hagor-gold px-1 text-[9px] font-bold text-black">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = search.trim();
              router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
            }}
            className="pb-2 lg:hidden"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-hagor-gold/40"
            />
          </form>
        </div>
        <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} categories={hagourCategories} isLoggedIn={isLoggedIn} role={role} />
      </div>
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}