"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { BRAND_DISPLAY, resolveHeroImageUrl } from "@/lib/hero";
import { pickLocalized } from "@/lib/localized";

type HeroBanner = {
  imageUrl: string | null;
};

type HeroCopy = {
  heroSubtitle_he: string | null;
  heroSubtitle_ar: string | null;
  heroSubtitle_en: string | null;
};

export function HeroSlider({
  heroImageUrl,
  banners,
  copy,
}: {
  heroImageUrl: string | null;
  banners: HeroBanner[];
  copy?: HeroCopy | null;
}) {
  const { t, dir, lang } = useStoreI18n();
  const isRtl = dir === "rtl";

  const bgUrl = useMemo(() => {
    const bannerUrl = banners.find((b) => b.imageUrl)?.imageUrl ?? null;
    return resolveHeroImageUrl(heroImageUrl, bannerUrl);
  }, [heroImageUrl, banners]);

  const overlayGradient = isRtl
    ? "linear-gradient(270deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.20) 100%)"
    : "linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%)";

  const subtitle = (copy && pickLocalized(copy, "heroSubtitle", lang)) || t("heroSubtitle");
  const tagline = t("heroTagline");

  return (
    <section className="relative isolate w-full overflow-hidden">
      <div
        className="hero-bg absolute inset-0 -z-10 bg-cover bg-no-repeat max-md:bg-[center_top] md:bg-[55%_center]"
        style={{ backgroundImage: `${overlayGradient}, url("${bgUrl}")` }}
        aria-hidden
      />

      <div
        className="relative z-10 mx-auto flex min-h-[620px] max-w-[1280px] flex-col justify-center px-4 py-12 sm:px-6 md:min-h-[720px] md:py-16 lg:min-h-[calc(100vh-110px)]"
        dir={dir}
      >
        <div
          className={`ms-auto flex w-full max-w-xl flex-col opacity-0 animate-[fadeUp_0.8s_ease-out_forwards] ${
            isRtl ? "items-end text-end" : "items-end text-end"
          }`}
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-hagor-gold sm:text-xs">{t("heroKicker")}</p>
          <h1 className="hero-title">{BRAND_DISPLAY}</h1>
          <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-zinc-200 sm:text-base md:text-lg">{subtitle}</p>
          <p className="mt-2 max-w-lg text-sm text-zinc-400">{tagline}</p>
        </div>

        <div className="mt-8 ms-auto flex w-full max-w-xl flex-col gap-3 opacity-0 animate-[fadeUp_0.9s_ease-out_0.15s_forwards] sm:flex-row sm:justify-end">
          <Link href="/products" className="hagor-btn min-w-[160px] text-center">
            {t("heroCta")}
          </Link>
          <Link href="/#about" className="hagor-btn-outline min-w-[140px] text-center">
            {t("heroContact")}
          </Link>
        </div>
      </div>
    </section>
  );
}
