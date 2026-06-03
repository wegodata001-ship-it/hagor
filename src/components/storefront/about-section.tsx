"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AssetImg } from "@/components/asset-img";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { DEFAULT_HERO_IMAGE } from "@/lib/hero";

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function AboutSection({ imageUrl }: { imageUrl?: string | null }) {
  const { t, dir } = useStoreI18n();
  const { ref, visible } = useScrollReveal();
  const src = imageUrl?.trim() || DEFAULT_HERO_IMAGE;

  const imageOrder = dir === "rtl" ? "order-1" : "order-1 md:order-2";
  const contentOrder = dir === "rtl" ? "order-2" : "order-2 md:order-1";

  const benefits = [
    { key: "aboutBenefit1" as const },
    { key: "aboutBenefit2" as const },
    { key: "aboutBenefit3" as const },
  ];

  const stats = [
    { value: "500+", labelKey: "aboutStatCustomers" as const },
    { value: "1000+", labelKey: "aboutStatProducts" as const },
    { value: "5★", labelKey: "aboutStatSatisfaction" as const },
  ];

  return (
    <section id="about" className="hagour-about scroll-mt-28" aria-labelledby="about-heading">
      <div
        ref={ref}
        className={`hagour-about__shell ${visible ? "is-visible" : ""}`}
        dir={dir}
      >
        <div className="hagour-about__grid">
          <div className={`hagour-about__media ${imageOrder}`}>
            <div className="hagour-about__image-wrap">
              <AssetImg path={src} alt="HAGOUR BY WAEL — Tactical Equipment" className="h-full w-full object-cover" />
              <div className="hagour-about__image-overlay" aria-hidden />
            </div>
          </div>

          <div className={`hagour-about__content ${contentOrder}`}>
            <h2 id="about-heading" className="hagour-about__title">
              {t("aboutTitle")}
            </h2>
            <p className="hagour-about__subtitle">{t("aboutSubtitle")}</p>

            <p className="hagour-about__lead">{t("aboutLead")}</p>
            <p className="hagour-about__body">{t("aboutBody")}</p>

            <ul className="hagour-about__benefits">
              {benefits.map((b) => (
                <li key={b.key} className="hagour-about__benefit">
                  <span className="hagour-about__check" aria-hidden>
                    ✓
                  </span>
                  <span>{t(b.key)}</span>
                </li>
              ))}
            </ul>

            <div className="hagour-about__stats">
              {stats.map((s) => (
                <div key={s.labelKey} className="hagour-about__stat">
                  <span className="hagour-about__stat-value">{s.value}</span>
                  <span className="hagour-about__stat-label">{t(s.labelKey)}</span>
                </div>
              ))}
            </div>

            <div className="hagour-about__actions">
              <Link href="/products" className="hagor-btn min-w-[140px] text-center">
                {t("aboutCtaCatalog")}
              </Link>
              <Link href="/#contact" className="hagor-btn-outline min-w-[140px] text-center">
                {t("aboutCtaContact")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
