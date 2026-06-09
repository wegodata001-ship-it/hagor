"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { ContactForm } from "@/components/storefront/contact-form";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import {
  MERCHANT_ADDRESS,
  merchantEmail,
  MERCHANT_LEGAL_NAME,
  MERCHANT_PHONE,
  merchantMailtoHref,
  merchantTelHref,
} from "@/lib/merchant-compliance";
import { SITE_NAME } from "@/lib/store";
import { filterHagourCategories } from "@/lib/hagour-catalog";

type FooterCategory = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
};

function FooterContactIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="site-footer__contact-icon" aria-hidden>
      <Icon strokeWidth={1.75} />
    </span>
  );
}

export function StoreFooter({
  storePhone,
  whatsappHref,
  telHref,
  categories = [],
}: {
  storePhone: string;
  whatsappHref: string;
  telHref: string;
  supportEmail?: string | null;
  categories?: FooterCategory[];
}) {
  const { t, lang, dir } = useStoreI18n();
  const mainCats = filterHagourCategories(categories);
  const year = new Date().getFullYear();

  const legalLinks = [
    { href: "/terms", label: t("siteTerms") },
    { href: "/privacy", label: t("footerLegalPrivacy") },
    { href: "/refunds", label: t("footerLegalRefunds") },
    { href: "/shipping", label: t("footerLegalShipping") },
  ] as const;

  return (
    <footer className="site-footer mt-12 border-t border-zinc-800 bg-hagor-black" dir={dir}>
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:py-12">
        <div className="site-footer__grid grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-10">
          {/* Col 1 — merchant compliance (payment provider) */}
          <section className="site-footer__compliance order-1" aria-label={MERCHANT_LEGAL_NAME}>
            <p className="text-lg font-black tracking-wide text-hagor-gold">{MERCHANT_LEGAL_NAME}</p>
            <ul className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-300">
              <li className="flex items-start gap-3">
                <FooterContactIcon icon={MapPin} />
                <span>
                  <span className="font-medium text-zinc-200">{t("footerAddressLabel")}</span>
                  <br />
                  {MERCHANT_ADDRESS}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FooterContactIcon icon={Phone} />
                <span>
                  <span className="font-medium text-zinc-200">{t("footerPhoneLabel")}</span>
                  <br />
                  <a href={merchantTelHref()} className="hover:text-hagor-gold">
                    {MERCHANT_PHONE}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FooterContactIcon icon={Mail} />
                <span>
                  <span className="font-medium text-zinc-200">{t("footerEmailLabel")}</span>
                  <br />
                  <a href={merchantMailtoHref()} className="break-all hover:text-hagor-gold">
                    {merchantEmail()}
                  </a>
                </span>
              </li>
            </ul>
          </section>

          {/* Col 2 — store brand */}
          <section className="site-footer__brand order-3 lg:order-2">
            <p className="text-sm font-semibold text-zinc-200">{SITE_NAME}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">{t("footerTagline")}</p>
          </section>

          {/* Col 3 — categories + service */}
          <section className="site-footer__nav order-4 lg:order-3">
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
            <p className="mt-5 text-sm font-semibold text-zinc-200">{t("customerService")}</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="/account/orders" className="hover:text-hagor-gold">
                  {t("orderTracking")}
                </Link>
              </li>
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
            </ul>
          </section>

          {/* Col 4 — legal policies */}
          <nav className="site-footer__legal order-2 lg:order-4" aria-label={t("footerPolicies")}>
            <p className="text-sm font-semibold text-zinc-200">{t("footerPolicies")}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-300">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-hagor-gold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div id="contact" className="mt-10 border-t border-zinc-800/80 pt-8">
          <p className="text-sm font-semibold text-zinc-200">{t("contactUs")}</p>
          <div className="mt-4 max-w-md">
            <ContactForm />
          </div>
        </div>

        <p className="site-footer__copyright mt-8 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
          © {year} {MERCHANT_LEGAL_NAME}
          <br />
          {t("footerRightsReserved")}
        </p>
      </div>
    </footer>
  );
}
