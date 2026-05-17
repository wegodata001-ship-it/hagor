"use client";

import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export function TopInfoBar({
  isLoggedIn,
  storePhone,
  telHref,
  whatsappHref,
}: {
  isLoggedIn: boolean;
  storePhone: string;
  telHref: string;
  whatsappHref: string;
}) {
  const { t } = useStoreI18n();
  return (
    <div className="hidden border-b border-zinc-800 bg-hagor-black text-[11px] text-zinc-400 md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span>{t("freeShipping")}</span>
          <span className="text-zinc-700">|</span>
          {storePhone && telHref ? (
            <a href={telHref} className="hover:text-hagor-gold">
              {storePhone}
            </a>
          ) : null}
          {whatsappHref ? (
            <>
              <span className="text-zinc-700">|</span>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-hagor-gold">
                WhatsApp
              </a>
            </>
          ) : null}
          <span className="text-zinc-700">|</span>
          <span>{t("customerService")}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isLoggedIn && (
            <Link href="/login" className="text-zinc-200 transition hover:text-hagor-gold">
              {t("loginRegister")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
