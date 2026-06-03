"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Headset,
  LockKeyhole,
  RotateCcw,
  Scale,
  Shield,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/localized";
import {
  buildSidebarNav,
  parseLegalSections,
  type ParsedLegalSection,
  type TermsSectionIcon,
} from "@/lib/parse-legal-sections";
import { useStoreI18n } from "@/components/storefront/store-i18n";

const SECTION_ICONS: Record<TermsSectionIcon, LucideIcon> = {
  shield: Shield,
  "shopping-bag": ShoppingBag,
  truck: Truck,
  "rotate-ccw": RotateCcw,
  lock: LockKeyhole,
  headset: Headset,
  scale: Scale,
};

const COPY = {
  he: {
    heroTitle: "תקנון האתר",
    heroSubtitle: "תנאי שימוש, מדיניות משלוחים, החזרות ורכישה באתר HAGOUR BY WAEL",
    navTitle: "ניווט מהיר",
    supportTitle: "שירות לקוחות",
    supportCta: "צור קשר",
    supportHint: "זמינים לכל שאלה בנוגע להזמנה, משלוח או החזרה",
  },
  ar: {
    heroTitle: "شروط الموقع",
    heroSubtitle: "شروط الاستخدام والشحن والإرجاع والشراء في موقع HAGOUR BY WAEL",
    navTitle: "تنقل سريع",
    supportTitle: "خدمة العملاء",
    supportCta: "تواصل معنا",
    supportHint: "لأي استفسار حول الطلب أو الشحن أو الإرجاع",
  },
  en: {
    heroTitle: "Site Terms",
    heroSubtitle: "Terms of use, shipping, returns and purchases on the HAGOUR BY WAEL website",
    navTitle: "Quick navigation",
    supportTitle: "Customer service",
    supportCta: "Contact us",
    supportHint: "We're here for questions about orders, delivery or returns",
  },
} as const;

function TermsSectionCard({ section }: { section: ParsedLegalSection }) {
  const Icon = SECTION_ICONS[section.icon];
  return (
    <article id={section.id} className="hagour-terms-card scroll-mt-28">
      <header className="hagour-terms-card__head">
        <span className="hagour-terms-card__icon" aria-hidden>
          <Icon strokeWidth={1.75} />
        </span>
        <h2 className="hagour-terms-card__title">{section.title}</h2>
      </header>
      <div
        className="hagour-terms-card__body"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />
    </article>
  );
}

export function HagourTermsPageClient({
  htmlByLang,
  fallback,
  storePhone,
  contactHref,
}: {
  htmlByLang: { he: string | null; ar: string | null; en: string | null };
  fallback: Record<Locale, string>;
  storePhone: string;
  contactHref: string;
}) {
  const { lang, dir } = useStoreI18n();
  const copy = COPY[lang];
  const raw = htmlByLang[lang]?.trim();
  const html = raw && raw.length > 0 ? raw : fallback[lang];

  const { introHtml, sections } = useMemo(() => parseLegalSections(html), [html]);
  const sidebar = useMemo(() => buildSidebarNav(sections, lang), [sections, lang]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div dir={dir} className="hagour-terms-page">
      <header className="hagour-terms-hero">
        <div className="hagour-terms-hero__inner mx-auto max-w-[1200px] px-4 py-12 md:py-16">
          <span className="hagour-terms-hero__icon" aria-hidden>
            <Shield strokeWidth={1.6} />
          </span>
          <h1 className="hagour-terms-hero__title">{copy.heroTitle}</h1>
          <p className="hagour-terms-hero__subtitle">{copy.heroSubtitle}</p>
          {introHtml ? (
            <div
              className="hagour-terms-hero__intro"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-8 md:pb-20 md:pt-10">
        <div className="hagour-terms-layout">
          {sections.length > 0 ? (
            <aside className="hagour-terms-sidebar" aria-label={copy.navTitle}>
              <p className="hagour-terms-sidebar__label">{copy.navTitle}</p>
              <nav className="hagour-terms-sidebar__nav">
                {sidebar.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className={`hagour-terms-sidebar__link${activeId === item.id ? " is-active" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </aside>
          ) : null}

          <div className="hagour-terms-main min-w-0">
            {sections.length > 0 ? (
              <div className="hagour-terms-sections">
                {sections.map((section) => (
                  <TermsSectionCard key={section.id} section={section} />
                ))}
              </div>
            ) : (
              <article className="hagour-terms-card">
                <div
                  className="hagour-terms-card__body"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </article>
            )}

            <aside className="hagour-terms-support" aria-label={copy.supportTitle}>
              <span className="hagour-terms-support__icon" aria-hidden>
                <Headset strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="hagour-terms-support__title">{copy.supportTitle}</h2>
                <p className="hagour-terms-support__phone">
                  <a href={`tel:${storePhone.replace(/\s/g, "")}`}>{storePhone}</a>
                </p>
                <p className="hagour-terms-support__hint">{copy.supportHint}</p>
              </div>
              {contactHref && contactHref !== "#" ? (
                contactHref.startsWith("http") ? (
                  <a
                    href={contactHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hagour-terms-support__cta"
                  >
                    {copy.supportCta}
                  </a>
                ) : (
                  <a href={contactHref} className="hagour-terms-support__cta">
                    {copy.supportCta}
                  </a>
                )
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
