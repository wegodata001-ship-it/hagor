"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import { resolvePublicAssetSrc } from "@/lib/assets-path";
import { SITE_NAME } from "@/lib/store";

const DEFAULT_HERO_BG = "/hagor-hero-fallback.svg";

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
    }, 6000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const current = slides[idx];
  const title = pickLocalized(current, "title", lang) || t("heroTitle");
  const subtitle = pickLocalized(current, "subtitle", lang);
  const btn = pickLocalized(current, "buttonText", lang) || t("heroCta");
  const bgSrc = current.imageUrl ? resolvePublicAssetSrc(current.imageUrl) : DEFAULT_HERO_BG;

  const overlayGradient = isRtl
    ? "linear-gradient(to left, rgba(11,11,11,0.88), rgba(11,11,11,0.35))"
    : "linear-gradient(to right, rgba(11,11,11,0.88), rgba(11,11,11,0.35))";

  const contentAlign =
    "flex h-full w-full max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 md:py-16 max-md:items-center max-md:text-center " +
    (isRtl ? "md:items-end md:text-end" : "md:items-start md:text-start");

  return (
    <section className="relative isolate min-h-[70vh] overflow-hidden md:min-h-[85vh]">
      <div
        className="absolute inset-0 -z-20 scale-105 bg-cover bg-center transition-transform duration-[1200ms] ease-out"
        style={{ backgroundImage: `url("${bgSrc}")` }}
      />
      <div className="absolute inset-0 -z-10 bg-black/55" style={{ background: overlayGradient }} />

      <div className="relative z-10 mx-auto flex h-full min-h-[70vh] md:min-h-[85vh]" dir={dir}>
        <div key={current.id} className={`${contentAlign} animate-in fade-in duration-700`}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.4em] text-hagor-gold sm:text-xs md:mb-3">
            {SITE_NAME}
          </p>
          <h1 className="max-w-2xl text-3xl font-black leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium text-zinc-300 sm:text-base md:mt-5 md:text-lg">
            {subtitle || t("heroSubtitle")}
          </p>
          <Link href={current.buttonUrl || "/products"} className="hagor-btn mt-6 md:mt-8">
            {btn}
          </Link>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition ${i === idx ? "w-7 bg-hagor-gold" : "w-2 bg-zinc-600/80"}`}
              aria-label={`slide-${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
