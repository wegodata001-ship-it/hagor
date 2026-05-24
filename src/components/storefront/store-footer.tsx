"use client";

import Link from "next/link";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import { SITE_NAME } from "@/lib/store";
import { filterHagourCategories } from "@/lib/hagour-catalog";

type FooterCategory = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
};

export function StoreFooter({
  storePhone,
  whatsappHref,
  telHref,
  supportEmail,
  categories = [],
}: {
  storePhone: string;
  whatsappHref: string;
  telHref: string;
  supportEmail: string | null;
  categories?: FooterCategory[];
}) {
  const { t, lang, dir } = useStoreI18n();
  const mainCats = filterHagourCategories(categories);

  return (
    <footer className="mt-12 border-t border-zinc-800 bg-hagor-black" dir={dir}>
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-black tracking-wide text-hagor-gold">{SITE_NAME}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">{t("footerTagline")}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-200">{t("footerCategories")}</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              {mainCats.map((c) => (
                <li key={c.id}>
                  <Link href={`/products?cat=${encodeURIComponent(c.id)}`} className="hover:text-hagor-gold">
                    {pickLocalized(c, "name", lang)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/products" className="hover:text-hagor-gold">
                  {t("allProducts")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-200">{t("customerService")}</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="/shipping" className="hover:text-hagor-gold">
                  {t("orderTracking")}
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-hagor-gold">
                  {t("navAbout")}
                </Link>
              </li>
            </ul>
          </div>

          <div id="contact">
            <p className="text-sm font-semibold text-zinc-200">{t("contactUs")}</p>
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
            <p className="mt-4 text-sm font-semibold text-zinc-200">{t("footerPolicies")}</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-400">
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
              <li>
                <Link href="/refunds" className="hover:text-hagor-gold">
                  {t("refunds")}
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
