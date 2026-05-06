"use client";

import Link from "next/link";
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
  gamingCollection,
  laptopDeals,
  audioCollection,
  smartHome,
  airConditionerDeals,
  newArrivals,
}: {
  banners: Banner[];
  promoBanners: Banner[];
  categories: Category[];
  featured: StoreProductCardData[];
  bestSellers: StoreProductCardData[];
  gamingCollection: StoreProductCardData[];
  laptopDeals: StoreProductCardData[];
  audioCollection: StoreProductCardData[];
  smartHome: StoreProductCardData[];
  airConditionerDeals: StoreProductCardData[];
  newArrivals: StoreProductCardData[];
}) {
  const { t, dir, lang } = useStoreI18n();
  const brands = [
    { name: "Apple", logo: "/demo/electronics/brands/apple.svg" },
    { name: "Samsung", logo: "/demo/electronics/brands/samsung.svg" },
    { name: "Sony", logo: "/demo/electronics/brands/sony.svg" },
    { name: "ASUS", logo: "/demo/electronics/brands/asus.svg" },
    { name: "Dell", logo: "/demo/electronics/brands/dell.svg" },
    { name: "Lenovo", logo: "/demo/electronics/brands/lenovo.svg" },
    { name: "HP", logo: "/demo/electronics/brands/hp.svg" },
    { name: "Xiaomi", logo: "/demo/electronics/brands/xiaomi.svg" },
    { name: "JBL", logo: "/demo/electronics/brands/jbl.svg" },
    { name: "LG", logo: "/demo/electronics/brands/lg.svg" },
    { name: "Electra", logo: "/demo/electronics/brands/electra.svg" },
    { name: "Tadiran", logo: "/demo/electronics/brands/tadiran.svg" },
  ];

  return (
    <div dir={dir}>
      <HeroSlider banners={banners} />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 md:space-y-7 md:py-6">
        <FeaturedCategories categories={categories} />
        <BenefitsRow />
        <ProductGrid title={t("hotDeals")} products={featured} />
        <ProductGrid title="Best Sellers" products={bestSellers} />
        <ProductGrid title="Gaming Collection" products={gamingCollection} />
        <ProductGrid title="Laptop Deals" products={laptopDeals} />
        <ProductGrid title="Audio Collection" products={audioCollection} />
        <ProductGrid title="Smart Home" products={smartHome} />
        <ProductGrid title="Air Conditioner Deals" products={airConditionerDeals} />
        <PromoCards banners={promoBanners} lang={lang} />
        <BrandsSlider brands={brands} />
        <ProductGrid title="New Arrivals" products={newArrivals} />
        <NewsletterBlock />
      </div>
    </div>
  );
}

function PromoCards({ banners, lang }: { banners: Banner[]; lang: "he" | "ar" | "en" }) {
  if (banners.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-zinc-100">Promo Cards</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {banners.slice(0, 4).map((banner) => (
          <Link
            key={banner.id}
            href={banner.buttonUrl || "/products"}
            className="group relative overflow-hidden rounded-2xl border border-zinc-800"
          >
            <AssetImg path={banner.imageUrl} alt={banner.title_en} className="h-44 w-full object-cover transition duration-500 group-hover:scale-105" />
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

function BrandsSlider({ brands }: { brands: Array<{ name: string; logo: string }> }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-zinc-100">Brands Slider</h2>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {brands.map((brand) => (
          <div
            key={brand.name}
            className="flex h-20 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 p-2"
          >
            <AssetImg path={brand.logo} alt={brand.name} className="h-8 w-auto object-contain opacity-90" />
          </div>
        ))}
      </div>
    </section>
  );
}

function NewsletterBlock() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 p-5 md:p-7">
      <h3 className="text-xl font-bold text-zinc-100">Newsletter</h3>
      <p className="mt-1 text-sm text-zinc-300">Get launches, exclusive deals and seasonal campaigns first.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          placeholder="you@example.com"
          className="h-10 flex-1 rounded-lg border border-zinc-700 bg-black/50 px-3 text-sm text-zinc-100 outline-none focus:border-orange-500"
        />
        <button type="button" className="h-10 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white">
          Subscribe
        </button>
      </div>
    </section>
  );
}
