"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { MobileMenu } from "@/components/storefront/mobile-menu";
import { LogoutButton } from "@/components/logout-button";

type Category = { id: string; parentId: string | null; name_he: string; name_ar: string; name_en: string };

export function MainNavbar({
  title,
  categories,
  isLoggedIn,
  role,
}: {
  title: string;
  categories: Category[];
  isLoggedIn: boolean;
  role: UserRole | null;
}) {
  const router = useRouter();
  const { items, lastAddedAt } = useCart();
  const { t, dir } = useStoreI18n();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    if (!lastAddedAt) return;
    setCartBounce(true);
    const id = window.setTimeout(() => setCartBounce(false), 500);
    return () => window.clearTimeout(id);
  }, [lastAddedAt]);

  useEffect(() => {
    const onOpenMenu = () => setMobileOpen(true);
    const onCloseMenu = () => setMobileOpen(false);
    window.addEventListener("desigma:open-mobile-menu", onOpenMenu);
    window.addEventListener("desigma:close-mobile-menu", onCloseMenu);
    return () => {
      window.removeEventListener("desigma:open-mobile-menu", onOpenMenu);
      window.removeEventListener("desigma:close-mobile-menu", onCloseMenu);
    };
  }, []);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-2.5 md:py-2.5" dir={dir}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-lg text-zinc-100 shadow-sm shadow-black/30 active:scale-[0.98]"
              aria-label="open-menu"
            >
              ☰
            </button>

            <Link
              href="/"
              className="mx-auto text-[18px] font-black tracking-tight text-white md:mx-0 md:text-2xl"
            >
              {title}
            </Link>
            <Link
              href="/#featured-categories"
              className="hidden rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-900/30 md:block"
            >
              {t("categories")}
            </Link>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
              }}
              className="mx-2 hidden flex-1 md:block"
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white outline-none ring-orange-500/60 placeholder:text-zinc-500 focus:ring"
              />
            </form>
            <div className="mr-auto flex items-center gap-2 text-zinc-300">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={`relative inline-flex h-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 text-sm text-zinc-100 shadow-sm shadow-black/30 hover:text-orange-300 active:scale-[0.98] md:h-auto md:rounded-lg md:border-zinc-700 md:bg-transparent md:px-3 md:py-2 md:text-sm ${cartBounce ? "animate-bounce" : ""}`}
                aria-label="open-cart"
              >
                <span className="md:hidden">🛒</span>
                <span className="hidden md:inline">עגלה</span>
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </button>
              {!isLoggedIn ? (
                <Link href="/login" className="hidden rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:text-orange-400 md:block">
                  {t("loginRegister")}
                </Link>
              ) : (
                <details className="relative hidden md:block">
                  <summary className="cursor-pointer list-none rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:text-orange-400">
                    {t("myAccount")}
                  </summary>
                  <div className="absolute left-0 mt-2 w-44 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
                    <Link href="/account/orders" className="block rounded px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-800">
                      {t("myOrders")}
                    </Link>
                    <Link href="/account/loyalty" className="block rounded px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-800">
                      {t("myPoints")}
                    </Link>
                    <div className="mt-1 rounded px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-800">
                      <LogoutButton label={t("logout")} />
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = search.trim();
              router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
            }}
            className="mt-2 md:hidden"
          >
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                ⌕
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש מוצרים, מותגים ודגמים..."
                className="h-11 w-full rounded-full border border-zinc-800 bg-white/5 pl-10 pr-4 text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500 shadow-[0_1px_0_rgba(255,255,255,0.04)] focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </form>
        </div>
        <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} categories={categories} isLoggedIn={isLoggedIn} role={role} />
      </div>
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
