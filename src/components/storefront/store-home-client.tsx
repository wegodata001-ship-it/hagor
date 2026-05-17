"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AssetImg } from "@/components/asset-img";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { BenefitsRow } from "@/components/storefront/benefits-row";
import { FeaturedCategories } from "@/components/storefront/featured-categories";
import { ProductGrid } from "@/components/storefront/product-grid";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import type { StoreProductCardData } from "@/components/storefront/product-card";
import { pickLocalized } from "@/lib/localized";

type Banner = {
  id: string;
  type?: "HERO" | "SECTION" | "POPUP" | "PROMO";
  title_he: string;
  title_ar: string;
  title_en: string;
  subtitle_he: string | null;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  imageUrl: string | null;
  buttonText_he: string | null;
  buttonText_ar: string | null;
  buttonText_en: string | null;
  buttonUrl: string | null;
};

type Category = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
  imageUrl: string | null;
};

export function StoreHomeClient({
  banners,
  promoBanners,
  categories,
  featured,
  bestSellers,
  tacticalClothing,
  tacticalBoots,
  protectionGear,
  optics,
  newArrivals,
}: {
  banners: Banner[];
  promoBanners: Banner[];
  categories: Category[];
  featured: StoreProductCardData[];
  bestSellers: StoreProductCardData[];
  tacticalClothing: StoreProductCardData[];
  tacticalBoots: StoreProductCardData[];
  protectionGear: StoreProductCardData[];
  optics: StoreProductCardData[];
  newArrivals: StoreProductCardData[];
}) {
  const { t, dir, lang } = useStoreI18n();

  return (
    <div dir={dir}>
      <HeroSlider banners={banners} />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 md:space-y-7 md:py-6">
        <Suspense fallback={<div className="min-h-[100px] animate-pulse rounded-2xl bg-zinc-900/30" aria-hidden />}>
          <FeaturedCategories categories={categories} />
        </Suspense>
        <BenefitsRow />
        <ProductGrid title={t("hotDeals")} products={featured} />
        <ProductGrid title={t("sectionClothing")} products={tacticalClothing} />
        <ProductGrid title={t("sectionBoots")} products={tacticalBoots} />
        <ProductGrid title={t("sectionProtection")} products={protectionGear} />
        <ProductGrid title={t("sectionOptics")} products={optics} />
        <ProductGrid title={t("bestSellers")} products={bestSellers} />
        <PromoCards banners={promoBanners} lang={lang} />
        <ProductGrid title={t("combatCollection")} products={protectionGear.length ? protectionGear : featured} />
        <ProductGrid title={t("newArrivals")} products={newArrivals} />
        <ReviewsSection />
        <SocialSection />
      </div>
    </div>
  );
}

function ReviewsSection() {
  const { t } = useStoreI18n();
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-xl font-bold text-white">{t("reviewsTitle")}</h2>
      <p className="mt-3 text-sm text-zinc-400">ביקורות לקוחות יוצגו כאן לאחר העלאה ב-Admin.</p>
    </section>
  );
}

function SocialSection() {
  const { t } = useStoreI18n();
  return (
    <section className="rounded-2xl border border-zinc-800 p-6 text-center">
      <h2 className="text-xl font-bold text-white">{t("socialTitle")}</h2>
      <p className="mt-2 text-sm text-zinc-400">@hagor.tactical</p>
    </section>
  );
}

function PromoCards({ banners, lang }: { banners: Banner[]; lang: "he" | "ar" | "en" }) {
  if (banners.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-zinc-100">{pickLocalized({ title_he: "מבצעים", title_ar: "عروض", title_en: "Promotions" }, "title", lang)}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {banners.slice(0, 4).map((banner) => (
          <Link
            key={banner.id}
            href={banner.buttonUrl || "/products"}
            className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-hagor-gray"
          >
            {banner.imageUrl ? (
              <AssetImg path={banner.imageUrl} alt={banner.title_en} className="h-44 w-full object-cover transition duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-hagor-black via-hagor-gray to-hagor-olive/30">
                <span className="text-2xl font-black text-hagor-gold/90">{pickLocalized(banner, "title", lang)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-black/80 to-black/40" />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-lg font-bold text-white">{pickLocalized(banner, "title", lang)}</p>
              <p className="text-sm text-zinc-200">{pickLocalized(banner, "subtitle", lang)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
