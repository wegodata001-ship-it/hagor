"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
import type { UserRole } from "@prisma/client";
import { pickLocalized } from "@/lib/localized";
import { BRAND_DISPLAY } from "@/lib/hero";
import { HagourNavIcon } from "@/components/storefront/hagour-icon";

type Category = { id: string; parentId: string | null; name_he: string; name_ar: string; name_en: string };

export function MobileMenu({
  open,
  onClose,
  categories,
  isLoggedIn,
  role,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  isLoggedIn: boolean;
  role: UserRole | null;
}) {
  const { t, lang, dir } = useStoreI18n();

  const links = [
    { href: "/", label: t("navHome") },
    ...categories.map((c) => ({
      href: `/products?cat=${encodeURIComponent(c.id)}`,
      label: pickLocalized(c, "name", lang),
    })),
    { href: "/#about", label: t("navAbout") },
    { href: "/#contact", label: t("heroContact") },
    { href: "/track-order", label: t("orderTracking") },
  ];

  const asideMotion = dir === "rtl" ? "100%" : "-100%";

  return (
    <AnimatePresence>
      {open ? (
        <div className="lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: asideMotion }}
            animate={{ x: 0 }}
            exit={{ x: asideMotion }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 end-0 z-[70] flex h-full w-[88%] max-w-sm flex-col border-s border-hagor-gold/25 bg-[#060606] p-4 text-white shadow-2xl"
            dir={dir}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-hagor-gold">
                  {BRAND_DISPLAY}
                </p>
                <p className="text-lg font-bold">{t("categories")}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-hagor-gold/25 bg-[#0d0d0d] text-zinc-100"
                aria-label="close"
              >
                <HagourNavIcon name="close" />
              </button>
            </div>

            <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="block whitespace-nowrap rounded-xl border border-zinc-800/80 bg-[#0d0d0d] px-3 py-3 text-sm font-medium text-zinc-100 transition-colors duration-150 hover:border-hagor-gold/40 hover:text-hagor-gold"
                >
                  {link.label}
                </Link>
              ))}

              {!isLoggedIn ? (
                <Link
                  href="/login"
                  onClick={onClose}
                  className="block whitespace-nowrap rounded-xl border border-hagor-gold/35 bg-[#0d0d0d] px-3 py-3 text-sm font-semibold text-hagor-gold"
                >
                  {t("loginRegister")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="block whitespace-nowrap rounded-xl border border-zinc-800/80 bg-[#0d0d0d] px-3 py-3 text-sm font-medium text-zinc-100"
                  >
                    {t("myAccount")}
                  </Link>
                  {role === "STORE_OWNER" || role === "SUPER_ADMIN" ? (
                    <Link
                      href="/admin"
                      onClick={onClose}
                      className="block whitespace-nowrap rounded-xl bg-gradient-to-r from-hagor-gold to-amber-700 px-3 py-3 text-center text-sm font-semibold text-black"
                    >
                      Admin
                    </Link>
                  ) : null}
                </>
              )}
            </nav>

            <div className="mt-4 border-t border-hagor-gold/20 pt-4">
              <LanguageSwitcher />
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
