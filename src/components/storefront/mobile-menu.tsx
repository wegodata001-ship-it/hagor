"use client";

import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import type { UserRole } from "@prisma/client";
import { useState } from "react";

type Category = { id: string; parentId: string | null; name_he: string; name_ar: string; name_en: string };

const pick = (c: Category, lang: "he" | "ar" | "en") =>
  lang === "ar" ? c.name_ar : lang === "en" ? c.name_en : c.name_he;

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
  const { t, lang } = useStoreI18n();
  const [openMain, setOpenMain] = useState<string | null>(null);
  if (!open) return null;
  const mains = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c);
    childrenByParent.set(c.parentId, list);
  }
  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{t("categories")}</span>
        <button type="button" onClick={onClose} className="text-zinc-300">
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {mains.map((c) => {
          const children = childrenByParent.get(c.id) ?? [];
          if (children.length === 0) {
            return (
              <Link
                key={c.id}
                href={`/products?cat=${encodeURIComponent(c.id)}`}
                onClick={onClose}
                className="block rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-orange-500/50"
              >
                {pick(c, lang)}
              </Link>
            );
          }
          const expanded = openMain === c.id;
          return (
            <div key={c.id} className="rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setOpenMain((prev) => (prev === c.id ? null : c.id))}
                className="flex w-full items-center justify-between px-3 py-2 text-sm text-zinc-200"
              >
                <span>{pick(c, lang)}</span>
                <span className={`text-orange-400 transition ${expanded ? "rotate-180" : ""}`}>▼</span>
              </button>
              <div
                className={`overflow-hidden border-t border-zinc-800 transition-all ${
                  expanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/products?cat=${encodeURIComponent(child.id)}`}
                    onClick={onClose}
                    className="block px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-orange-300"
                  >
                    {pick(child, lang)}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        {!isLoggedIn ? (
          <>
            <Link href="/login" onClick={onClose} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white">
              התחברות
            </Link>
            <Link href="/register" onClick={onClose} className="rounded-lg bg-orange-500 px-3 py-2 text-sm text-white">
              הרשמה
            </Link>
          </>
        ) : (
          <>
            <Link href="/account" onClick={onClose} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white">
              {t("myAccount")}
            </Link>
            {role === "STORE_OWNER" || role === "SUPER_ADMIN" ? (
              <Link href="/admin" onClick={onClose} className="rounded-lg bg-orange-500 px-3 py-2 text-sm text-white">
                Admin
              </Link>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
