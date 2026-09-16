"use client";

import { ReviewMediaType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart-context";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { BeltProductOptions, HolsterProductOptions } from "@/components/storefront/product-option-pickers";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";
import { RelatedProductsModal } from "@/components/storefront/related-products-modal";
import { HagourCheckIcon } from "@/components/storefront/hagour-icon";
import {
  type BuckleType,
  type CategoryOptionProfile,
  type ProductSelectedOptions,
  resolveFixedBuckleType,
  validateSelectedOptionsForProfile,
} from "@/lib/hagour-product-options";

type VariantOption = {
  id: string;
  value: string;
  priceAdd: number;
  stock: number | null;
  sku: string | null;
  image: string | null;
  isDefault: boolean;
  sortOrder: number;
};
type VariantGroup = { id: string; name: string; sortOrder: number; options: VariantOption[] };

type RelatedProduct = {
  id: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  price: number;
  stock: number;
  image: string | null;
};

type ReviewItem = {
  id: string;
  mediaType: ReviewMediaType;
  name: string;
  title: string | null;
  rating: number;
  comment: string;
  imageUrl: string | null;
  videoUrl: string | null;
};

type ProductDetails = {
  id: string;
  sku: string;
  name_he: string;
  name_ar: string;
  name_en: string;
  description_he: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  stock: number;
  category: { id: string; name_he: string; name_ar: string; name_en: string };
  optionProfile: CategoryOptionProfile | null;
  images: { id: string; url: string }[];
  variantGroups: VariantGroup[];
  relatedProducts: RelatedProduct[];
};

const ADD_BTN =
  "h-[54px] w-full rounded-xl border border-[#d3a20e]/35 bg-gradient-to-r from-[#d3a20e] to-[#b8860b] text-[15px] font-bold text-black shadow-none transition hover:brightness-105 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400";
const BUY_BTN =
  "h-[52px] w-full rounded-xl border border-[#d3a20e] bg-transparent text-[15px] font-semibold text-[#d3a20e] transition hover:bg-[#d3a20e]/10 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500";

type TabId = "description" | "specs" | "shipping" | "reviews";

export function StoreProductDetailClient({
  product,
  reviews = [],
}: {
  product: ProductDetails;
  reviews?: ReviewItem[];
}) {
  const { lang, dir, t } = useStoreI18n();
  const router = useRouter();
  const { addItem } = useCart();
  const optionsRef = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState(1);
  const [crossSellOpen, setCrossSellOpen] = useState(false);
  const [hagourOptions, setHagourOptions] = useState<ProductSelectedOptions | null>(null);
  const [buckleType, setBuckleType] = useState<BuckleType | null>(null);
  const [selectedSizeKey, setSelectedSizeKey] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [tab, setTab] = useState<TabId>("description");
  const [mobileOpen, setMobileOpen] = useState<TabId | null>("description");
  const optionProfile = product.optionProfile;
  const fixedBuckleType = resolveFixedBuckleType(product.id);
  const validationError = validateSelectedOptionsForProfile(
    optionProfile,
    hagourOptions,
    fixedBuckleType,
  );
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of product.variantGroups ?? []) {
      const def = g.options.find((o) => o.isDefault) ?? g.options[0];
      if (def) init[g.id] = def.id;
    }
    return init;
  });
  const title = pickLocalized(product, "name", lang);
  const desc = pickLocalized(product, "description", lang);
  const categoryName = pickLocalized(product.category, "name", lang);
  const selectedOptionIds = useMemo(() => Object.values(selectedByGroup).filter(Boolean), [selectedByGroup]);
  const selectedOptions = useMemo(() => {
    const byId = new Map<string, VariantOption>();
    for (const g of product.variantGroups ?? []) for (const o of g.options ?? []) byId.set(o.id, o);
    return selectedOptionIds.map((id) => byId.get(id)).filter(Boolean) as VariantOption[];
  }, [product.variantGroups, selectedOptionIds]);
  const price = useMemo(() => {
    const add = selectedOptions.reduce((s, o) => s + (Number.isFinite(o.priceAdd) ? o.priceAdd : 0), 0);
    return Math.round((product.price + add) * 100) / 100;
  }, [product.price, selectedOptions]);
  const variantHeroImage = useMemo(() => selectedOptions.find((o) => o.image)?.image ?? null, [selectedOptions]);

  const optionHint = useMemo(() => {
    if (!attempted || !validationError) return null;
    if (!hagourOptions) {
      return optionProfile === "BELT" ? t("chooseSizeError") : t("chooseSideError");
    }
    return validationError;
  }, [attempted, validationError, hagourOptions, optionProfile, t]);

  const specRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (product.sku) rows.push({ label: t("skuLabel"), value: product.sku });
    if (categoryName) rows.push({ label: t("categoryLabel"), value: categoryName });
    rows.push({
      label: t("availabilityLabel"),
      value: product.stock > 0 ? t("inStock") : t("outOfStock"),
    });
    return rows;
  }, [product.sku, product.stock, categoryName, t]);

  const stockLabel =
    product.stock <= 0 ? t("outOfStock") : product.stock <= 5 ? t("lastUnits") : t("inStock");

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: t("tabDescription") },
    { id: "specs", label: t("tabSpecs") },
    { id: "shipping", label: t("tabShipping") },
    { id: "reviews", label: t("tabReviews") },
  ];

  const trustItems = [t("trustSecurePay"), t("trustNationwide"), t("trustWarranty"), t("trustSupport")];

  const addBtnClass = ADD_BTN;

  function scrollToOptions() {
    optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function tryAddToCart() {
    if (product.stock <= 0) return false;
    if (validationError) {
      setAttempted(true);
      scrollToOptions();
      return false;
    }
    addItem(product.id, qty, selectedOptionIds, hagourOptions ?? null);
    return true;
  }

  function onAddToCart() {
    if (!tryAddToCart()) return;
    if (product.relatedProducts.length > 0) setCrossSellOpen(true);
  }

  function onBuyNow() {
    if (!tryAddToCart()) return;
    router.push("/checkout");
  }

  const galleryImages = [
    ...(variantHeroImage ? [{ id: "variant", url: variantHeroImage }] : []),
    ...product.images,
  ];

  return (
    <div dir={dir} className="mx-auto max-w-[1450px] px-4 py-6 pb-28 md:px-6 md:pb-8 lg:px-8">
      <nav className="text-xs text-[#aaa]" aria-label="breadcrumb">
        <Link href="/" className="transition-colors hover:text-[#d3a20e]">
          {t("breadcrumbHome")}
        </Link>
        <span className="mx-1.5">›</span>
        <Link
          href={`/products?cat=${encodeURIComponent(product.category.id)}`}
          className="transition-colors hover:text-[#d3a20e]"
        >
          {categoryName}
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-[#f7f7f7]">{title}</span>
      </nav>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,55%)_minmax(0,45%)] lg:gap-8">
        <ProductGallery title={title} images={galleryImages} />

        <div className="lg:sticky lg:top-[168px] lg:self-start">
          <p className="text-xs font-medium uppercase tracking-wide text-[#aaa]">{categoryName}</p>
          <h1 className="mt-2 text-[32px] font-bold leading-tight text-[#f7f7f7] lg:text-[36px]">{title}</h1>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[34px] font-bold leading-none text-[#d3a20e] lg:text-[38px]">₪{price.toFixed(2)}</span>
            {product.oldPrice ? (
              <span className="text-lg text-[#aaa] line-through">₪{product.oldPrice.toFixed(2)}</span>
            ) : null}
          </div>
          {product.discountPercent ? (
            <div className="mt-2 inline-block rounded-full bg-[#d3a20e]/15 px-3 py-1 text-xs text-[#d3a20e]">
              {product.discountPercent}%
            </div>
          ) : null}
          {desc ? <p className="mt-4 line-clamp-3 text-base leading-relaxed text-[#aaa] lg:text-lg">{desc}</p> : null}

          {(product.variantGroups?.length ?? 0) > 0 && (
            <div className="mt-4 space-y-3">
              {product.variantGroups.map((g) => (
                <div key={g.id}>
                  <div className="mb-2 text-sm font-semibold text-[#f7f7f7]">{g.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((o) => {
                      const selected = selectedByGroup[g.id] === o.id;
                      const extra = o.priceAdd ? `+₪${Number(o.priceAdd).toFixed(0)}` : "";
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSelectedByGroup((prev) => ({ ...prev, [g.id]: o.id }))}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            selected
                              ? "border-[#d3a20e] bg-[#111113] text-white"
                              : "border-[rgba(212,160,23,0.18)] bg-[#0d0d0d] text-zinc-200"
                          }`}
                        >
                          <span className="font-medium">{o.value}</span>
                          {extra ? <span className="ms-2 text-xs text-[#aaa]">{extra}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={optionsRef}>
            {optionProfile === "BELT" ? (
              <BeltProductOptions
                selectedSizeKey={selectedSizeKey}
                buckleType={fixedBuckleType ?? buckleType}
                fixedBuckleType={fixedBuckleType}
                onSizeChange={(opts) => {
                  setHagourOptions(opts);
                  if (opts) setSelectedSizeKey(`${opts.beltSize}-${opts.policePantsSize}`);
                  else setSelectedSizeKey(null);
                }}
                onBuckleChange={setBuckleType}
                error={optionHint}
              />
            ) : null}

            {optionProfile === "HOLSTER" ? (
              <HolsterProductOptions
                handSide={hagourOptions?.type === "HOLSTER" ? hagourOptions.handSide : null}
                onChange={setHagourOptions}
                error={optionHint}
              />
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block h-2 w-2 rounded-full ${product.stock > 0 ? "bg-emerald-400" : "bg-red-400"}`}
              />
              <span className={product.stock > 0 ? "text-emerald-400" : "text-red-400"}>{stockLabel}</span>
            </div>
            <div className="inline-flex h-11 items-center overflow-hidden rounded-xl border border-[rgba(212,160,23,0.18)] bg-[#111113]">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-11 w-11 text-lg text-[#f7f7f7]"
                aria-label="-"
              >
                −
              </button>
              <span className="w-10 text-center text-sm text-[#f7f7f7]">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(Math.max(product.stock, 1), q + 1))}
                className="h-11 w-11 text-lg text-[#f7f7f7]"
                aria-label="+"
              >
                +
              </button>
            </div>
            <span className="text-sm text-[#aaa]">{t("qtyLabel")}</span>
          </div>

          <div className="mt-4 space-y-2">
            <button type="button" disabled={product.stock <= 0} onClick={onAddToCart} className={addBtnClass}>
              {product.stock <= 0 ? t("outOfStock") : t("addToBag")}
            </button>
            <button type="button" disabled={product.stock <= 0} onClick={onBuyNow} className={BUY_BTN}>
              {t("buyNow")}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] leading-tight text-[#aaa] sm:grid-cols-4">
            {trustItems.map((label) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="shrink-0 text-[#d3a20e]" aria-hidden>
                  <HagourCheckIcon />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-[rgba(212,160,23,0.18)] bg-[#111113]">
        <div className="hidden border-b border-[rgba(212,160,23,0.18)] md:flex">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-5 py-3 text-sm font-semibold ${
                tab === item.id ? "border-b-2 border-[#d3a20e] text-[#f7f7f7]" : "text-[#aaa] hover:text-[#f7f7f7]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="hidden p-5 text-sm leading-relaxed text-[#aaa] md:block">
          <TabBody id={tab} desc={desc} specRows={specRows} reviews={reviews} t={t} />
        </div>
        <div className="md:hidden">
          {tabs.map((item) => {
            const open = mobileOpen === item.id;
            return (
              <div key={item.id} className="border-b border-[rgba(212,160,23,0.18)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setMobileOpen(open ? null : item.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-[#f7f7f7]"
                >
                  {item.label}
                  <span className="text-[#d3a20e]">{open ? "−" : "+"}</span>
                </button>
                {open ? (
                  <div className="px-4 pb-4 text-sm leading-relaxed text-[#aaa]">
                    <TabBody id={item.id} desc={desc} specRows={specRows} reviews={reviews} t={t} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(212,160,23,0.18)] bg-[#080808]/95 p-3 md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-[5.5rem] text-lg font-bold text-[#d3a20e]">₪{price.toFixed(2)}</div>
          <button type="button" disabled={product.stock <= 0} onClick={onAddToCart} className={addBtnClass}>
            {product.stock <= 0 ? t("outOfStock") : t("addToBag")}
          </button>
        </div>
      </div>

      {product.relatedProducts.length > 0 && (
        <RelatedProductsModal
          open={crossSellOpen}
          onClose={() => setCrossSellOpen(false)}
          main={{
            productId: product.id,
            qty,
            optionIds: selectedOptionIds,
            selectedOptions: hagourOptions ?? null,
            title,
            alreadyAdded: true,
          }}
          mainDisplay={{ image: product.images[0]?.url ?? null, price }}
          related={product.relatedProducts}
        />
      )}
    </div>
  );
}

function TabBody({
  id,
  desc,
  specRows,
  reviews,
  t,
}: {
  id: TabId;
  desc: string;
  specRows: { label: string; value: string }[];
  reviews: ReviewItem[];
  t: (key: string) => string;
}) {
  if (id === "description") {
    return <p>{desc || t("noDescription")}</p>;
  }
  if (id === "specs") {
    return (
      <dl className="grid gap-2 sm:grid-cols-2">
        {specRows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 rounded-lg border border-[rgba(212,160,23,0.12)] bg-[#080808] px-3 py-2">
            <dt className="text-[#aaa]">{row.label}</dt>
            <dd className="font-medium text-[#f7f7f7]">{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (id === "shipping") {
    return <p>{t("shippingTabBody")}</p>;
  }
  if (reviews.length === 0) return <p>{t("noReviewsYet")}</p>;
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl border border-[rgba(212,160,23,0.12)] bg-[#080808] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-[#f7f7f7]">{r.name}</span>
            <span className="text-xs text-[#d3a20e]">
              {r.mediaType === ReviewMediaType.VIDEO ? t("reviewVideoLabel") : "★".repeat(Math.max(1, Math.min(5, r.rating)))}
            </span>
          </div>
          {r.title ? <p className="mt-1 text-sm font-semibold text-white">{r.title}</p> : null}
          {r.comment ? <p className="mt-1 text-sm">{r.comment}</p> : null}
        </li>
      ))}
    </ul>
  );
}
