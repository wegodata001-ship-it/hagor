"use client";

import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { SITE_NAME } from "@/lib/store";

export function StoreFooter({
  storePhone,
  whatsappHref,
  telHref,
  supportEmail,
}: {
  storePhone: string;
  whatsappHref: string;
  telHref: string;
  supportEmail: string | null;
}) {
  const { t } = useStoreI18n();
  return (
    <footer className="mt-12 border-t border-zinc-800 bg-hagor-black">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-lg font-black tracking-wide text-hagor-gold">{SITE_NAME}</p>
            <p className="mt-2 text-sm text-zinc-400">{t("footerTagline")}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">{t("customerService")}</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              {storePhone && telHref ? (
                <li>
                  <a href={telHref} className="hover:text-hagor-gold">
                    {storePhone}
                  </a>
                </li>
              ) : null}
              {whatsappHref ? (
                <li>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-hagor-gold">
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {supportEmail ? (
                <li>
                  <a href={`mailto:${supportEmail}`} className="hover:text-hagor-gold">
                    {supportEmail}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">{t("footerLinks")}</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="/products" className="hover:text-hagor-gold">
                  {t("allProducts")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-hagor-gold">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-hagor-gold">
                  {t("privacy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
