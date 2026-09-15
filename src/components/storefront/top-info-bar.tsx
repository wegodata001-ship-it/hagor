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
  const { t, dir } = useStoreI18n();

  return (
    <div className="border-b border-[rgba(212,163,22,0.2)] bg-[#0a0a0a] text-[11px] leading-none text-[#aaa]">
      <div
        dir={dir}
        className="mx-auto flex h-8 max-w-[1440px] items-center justify-between gap-3 px-4 md:h-[30px] md:px-8 xl:px-10"
      >
        {/* Mobile: compact contact + shipping */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden md:hidden">
          <span className="truncate whitespace-nowrap">{t("freeShipping")}</span>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 whitespace-nowrap transition-colors duration-150 hover:text-[#d6a316]"
            >
              WhatsApp
            </a>
          ) : null}
          {storePhone && telHref ? (
            <a href={telHref} className="shrink-0 whitespace-nowrap transition-colors duration-150 hover:text-[#d6a316]" dir="ltr">
              {storePhone}
            </a>
          ) : null}
        </div>

        {/* Desktop left cluster */}
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <span className="whitespace-nowrap">{t("freeShipping")}</span>
          <span className="text-zinc-700" aria-hidden>
            |
          </span>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap transition-colors duration-150 hover:text-[#d6a316]"
            >
              WhatsApp
            </a>
          ) : null}
          {storePhone && telHref ? (
            <>
              <span className="text-zinc-700" aria-hidden>
                |
              </span>
              <a
                href={telHref}
                className="whitespace-nowrap transition-colors duration-150 hover:text-[#d6a316]"
                dir="ltr"
              >
                {storePhone}
              </a>
            </>
          ) : null}
        </div>

        {/* Desktop right cluster */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/#contact" className="whitespace-nowrap transition-colors duration-150 hover:text-[#d6a316]">
            {t("customerService")}
          </Link>
          <span className="text-zinc-700" aria-hidden>
            |
          </span>
          <Link
            href="/track-order"
            className="whitespace-nowrap font-semibold text-[#e8c35a] transition-colors duration-150 hover:text-[#d6a316]"
          >
            {t("orderTracking")}
          </Link>
          <span className="text-zinc-700" aria-hidden>
            |
          </span>
          {isLoggedIn ? (
            <Link href="/account" className="whitespace-nowrap transition-colors duration-150 hover:text-[#d6a316]">
              {t("myAccount")}
            </Link>
          ) : (
            <Link href="/login" className="whitespace-nowrap transition-colors duration-150 hover:text-[#d6a316]">
              {t("loginRegister")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
