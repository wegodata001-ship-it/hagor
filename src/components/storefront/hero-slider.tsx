"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import { resolvePublicAssetSrc } from "@/lib/assets-path";

/** Local asset in /public/hero.png — main homepage hero when no banner image is set. */
const DEFAULT_HERO_BG = "/hero.png";

type HeroBanner = {
  id: string;
  title_he: string;
  title_ar: string;
  title_en: string;
  subtitle_he: string | null;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  buttonText_he: string | null;
  buttonText_ar: string | null;
  buttonText_en: string | null;
  buttonUrl: string | null;
  imageUrl: string | null;
};

export function HeroSlider({ banners }: { banners: HeroBanner[] }) {
  const { lang, t, dir } = useStoreI18n();
  const isRtl = dir === "rtl";

  const slides = useMemo(
    () =>
      banners.length > 0
        ? banners
        : [
            {
              id: "fallback",
              title_he: t("heroTitle"),
              title_ar: t("heroTitle"),
              title_en: t("heroTitle"),
              subtitle_he: t("heroSubtitle"),
              subtitle_ar: t("heroSubtitle"),
              subtitle_en: t("heroSubtitle"),
              buttonText_he: t("heroCta"),
              buttonText_ar: t("heroCta"),
              buttonText_en: t("heroCta"),
              buttonUrl: "/products",
              imageUrl: DEFAULT_HERO_BG,
            },
          ],
    [banners, t],
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const current = slides[idx];
  const title = pickLocalized(current, "title", lang) || t("heroTitle");
  const subtitle = pickLocalized(current, "subtitle", lang);
  const btn = pickLocalized(current, "buttonText", lang) || t("heroCta");
  const bgSrc = current.imageUrl ? resolvePublicAssetSrc(current.imageUrl) : DEFAULT_HERO_BG;

  const overlayGradient = isRtl
    ? "linear-gradient(to left, rgba(0,0,0,0.75), rgba(0,0,0,0.2))"
    : "linear-gradient(to right, rgba(0,0,0,0.75), rgba(0,0,0,0.2))";

  const contentAlign =
    "flex h-full w-full max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 md:py-16 max-md:items-center max-md:text-center " +
    (isRtl ? "md:items-end md:text-end" : "md:items-start md:text-start");

  return (
    <section className="relative isolate overflow-hidden" style={{ width: "100%", height: "90vh", minHeight: "22rem" }}>
      <div
        className="absolute inset-0 -z-20 transition-all duration-700"
        style={{
          backgroundImage: `url("${bgSrc}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 -z-10" style={{ background: overlayGradient }} />

      <div className="relative z-10 mx-auto flex h-full" dir={dir}>
        <div key={current.id} className={`${contentAlign} animate-in fade-in duration-700`}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400/95 sm:text-xs md:mb-3">
            DESIGMA
          </p>
          <h1 className="max-w-xl text-3xl font-black leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-3 max-w-lg text-sm font-medium text-zinc-200 sm:text-base md:mt-4 md:text-lg">
            {subtitle || t("heroSubtitle")}
          </p>
          <Link
            href={current.buttonUrl || "/products"}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-900/35 transition hover:-translate-y-0.5 hover:brightness-105 md:mt-8 md:px-8 md:text-base"
          >
            {btn}
          </Link>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition ${i === idx ? "w-7 bg-orange-500" : "w-2 bg-zinc-500/80"}`}
            aria-label={`slide-${i + 1}`}
          />
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIdx((idx - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-zinc-600/80 bg-black/40 px-2.5 py-1 text-lg text-white backdrop-blur-sm transition hover:bg-black/55 md:left-5"
            aria-label="previous-slide"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIdx((idx + 1) % slides.length)}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-zinc-600/80 bg-black/40 px-2.5 py-1 text-lg text-white backdrop-blur-sm transition hover:bg-black/55 md:right-5"
            aria-label="next-slide"
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}
