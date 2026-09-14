"use client";

import { Suspense } from "react";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { BenefitsRow } from "@/components/storefront/benefits-row";
import { FeaturedCategories } from "@/components/storefront/featured-categories";
import {
  CustomerReviewsSection,
  type CustomerReviewItem,
} from "@/components/storefront/customer-reviews-section";
import { HomeProductsSection } from "@/components/storefront/home-products-section";
import { AboutSection } from "@/components/storefront/about-section";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import type { HomeProductCard } from "@/lib/home-product-filters";

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
  heroImageUrl,
  heroCopy,
  banners,
  categories,
  products,
  reviews,
}: {
  heroImageUrl: string | null;
  heroCopy: {
    heroSubtitle_he: string | null;
    heroSubtitle_ar: string | null;
    heroSubtitle_en: string | null;
  } | null;
  banners: Banner[];
  categories: Category[];
  products: HomeProductCard[];
  reviews: CustomerReviewItem[];
}) {
  const { dir } = useStoreI18n();

  return (
    <div dir={dir} className="overflow-x-hidden">
      <HeroSlider heroImageUrl={heroImageUrl} banners={banners} copy={heroCopy} />
      <div className="mx-auto w-full max-w-[1280px] space-y-10 px-4 py-8 md:space-y-12 md:py-10">
        <BenefitsRow />
        <Suspense fallback={<div className="min-h-[200px] animate-pulse rounded-[18px] bg-zinc-900/40" aria-hidden />}>
          <FeaturedCategories categories={categories} />
        </Suspense>
        <Suspense fallback={<div className="min-h-[320px] animate-pulse rounded-[18px] bg-zinc-900/40" aria-hidden />}>
          <HomeProductsSection products={products} categories={categories} />
        </Suspense>
        <CustomerReviewsSection reviews={reviews} />
        <AboutSection imageUrl={heroImageUrl} />
      </div>
    </div>
  );
}
