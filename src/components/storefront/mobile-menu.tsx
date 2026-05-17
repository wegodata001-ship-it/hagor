"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import type { UserRole } from "@prisma/client";
import { CategoryAccordion } from "@/components/storefront/category-accordion";

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
  const { t } = useStoreI18n();
  return (
    <AnimatePresence>
      {open ? (
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-50 h-full w-[86%] max-w-sm border-l border-zinc-800 bg-[#050816] p-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-hagor-gold/85">
                  HAGOR BY WAEL
                </div>
                <div className="text-lg font-bold">{t("categories")}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-100 active:scale-[0.98]"
                aria-label="close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <CategoryAccordion
                variant="dark"
                categories={categories}
                onNavigate={onClose}
                className="space-y-2"
                hrefForId={(id) => `/products?cat=${encodeURIComponent(id)}`}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {!isLoggedIn ? (
                <>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-center text-[13px] font-semibold text-white active:scale-[0.98]"
                  >
                    התחברות
                  </Link>
                  <Link
                    href="/register"
                    onClick={onClose}
                    className="rounded-xl bg-gradient-to-r from-hagor-gold to-amber-700 px-3 py-2.5 text-center text-[13px] font-semibold text-white shadow-lg shadow-black/25 active:scale-[0.98]"
                  >
                    הרשמה
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-center text-[13px] font-semibold text-white active:scale-[0.98]"
                  >
                    {t("myAccount")}
                  </Link>
                  {role === "STORE_OWNER" || role === "SUPER_ADMIN" ? (
                    <Link
                      href="/admin"
                      onClick={onClose}
                      className="rounded-xl bg-gradient-to-r from-hagor-gold to-amber-700 px-3 py-2.5 text-center text-[13px] font-semibold text-white shadow-lg shadow-black/25 active:scale-[0.98]"
                    >
                      Admin
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-2.5 text-center text-[13px] font-semibold text-zinc-300"
                    >
                      סגור
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
