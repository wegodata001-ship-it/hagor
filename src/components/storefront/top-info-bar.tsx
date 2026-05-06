"use client";

import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export function TopInfoBar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t } = useStoreI18n();
  return (
    <div className="hidden border-b border-zinc-800 bg-black text-[11px] text-zinc-400 md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span>{t("freeShipping")}</span>
          <span className="text-zinc-700">|</span>
          <span>072-000-0000</span>
          <span className="text-zinc-700">|</span>
          <span>{t("customerService")}</span>
          <span className="text-zinc-700">|</span>
          <span>{t("orderTracking")}</span>
          <span className="text-zinc-700">|</span>
          <span>{t("branches")}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isLoggedIn && (
            <Link href="/login" className="text-zinc-200 transition hover:text-orange-400">
              {t("loginRegister")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
