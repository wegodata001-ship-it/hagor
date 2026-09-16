"use client";

import { ReviewMediaType } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { resolvePublicAssetSrc } from "@/lib/assets-path";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export type CustomerReviewItem = {
  id: string;
  mediaType: ReviewMediaType;
  name: string;
  title: string | null;
  rating: number;
  comment: string;
  imageUrl: string | null;
  videoUrl: string | null;
};

function StarRow({ rating }: { rating: number }) {
  const safe = Math.min(5, Math.max(1, Math.round(rating)));
  return (
    <p className="hagour-review-stars" aria-label={`${safe} / 5`}>
      {"★".repeat(safe)}
      <span className="sr-only">{safe} stars</span>
    </p>
  );
}

function shortComment(comment: string): string | null {
  const text = comment.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= 120) return text;
  return `${text.slice(0, 117).trim()}…`;
}

function ReviewCard({
  review,
  onOpen,
}: {
  review: CustomerReviewItem;
  onOpen: (review: CustomerReviewItem) => void;
}) {
  const { t } = useStoreI18n();
  const hasImage = Boolean(review.imageUrl?.trim());
  const blurb = hasImage ? shortComment(review.comment) : review.comment.trim() || null;
  const lines = !hasImage && blurb ? blurb.split("\n").filter(Boolean) : null;
  const isVideo = review.mediaType === ReviewMediaType.VIDEO;

  if (isVideo) {
    return (
      <article className="hagour-review-card">
        <button
          type="button"
          className="hagour-review-card__media relative"
          onClick={() => onOpen(review)}
          aria-label={t("reviewOpenVideo").replace("{name}", review.name)}
        >
          {hasImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvePublicAssetSrc(review.imageUrl!)}
                alt={review.title || review.name}
                className="hagour-review-card__image"
                loading="lazy"
              />
              <span className="absolute inset-0 bg-black/25" aria-hidden />
            </>
          ) : (
            <div className="flex h-[340px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-800 text-hagor-gold">
              <span className="text-6xl" aria-hidden>▶</span>
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-hagor-gold/50 bg-black/70 text-3xl text-hagor-gold shadow-lg">
              ▶
            </span>
          </span>
        </button>
        <div className="hagour-review-card__body items-start text-start">
          <span className="rounded-full bg-hagor-gold/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-hagor-gold">
            {t("reviewVideoLabel")}
          </span>
          <p className="hagour-review-card__name">{review.name}</p>
          {review.title ? <p className="text-sm font-semibold text-white">{review.title}</p> : null}
          {review.comment ? <p className="hagour-review-card__blurb">{review.comment}</p> : null}
          <span className="mt-1 text-sm font-semibold text-hagor-gold">{t("reviewWatchVideo")}</span>
        </div>
      </article>
    );
  }

  return (
    <article className="hagour-review-card">
      {hasImage ? (
        <button
          type="button"
          className="hagour-review-card__media"
          onClick={() => onOpen(review)}
          aria-label={t("reviewOpenImage").replace("{name}", review.name)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvePublicAssetSrc(review.imageUrl!)}
            alt={review.name}
            className="hagour-review-card__image"
            loading="lazy"
          />
        </button>
      ) : (
        <div className="hagour-review-card__media hagour-review-card__media--empty" aria-hidden>
          <span className="text-hagor-gold/80 text-3xl font-black">★</span>
        </div>
      )}
      <div className="hagour-review-card__body">
        <StarRow rating={review.rating} />
        <p className="hagour-review-card__name">{review.name}</p>
        {hasImage && blurb ? <p className="hagour-review-card__blurb">{blurb}</p> : null}
        {!hasImage && lines ? (
          <blockquote className="hagour-review-card__quote">
            {lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </blockquote>
        ) : null}
      </div>
    </article>
  );
}

function ReviewLightbox({
  review,
  onClose,
}: {
  review: CustomerReviewItem;
  onClose: () => void;
}) {
  const { t } = useStoreI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="hagour-review-lightbox" role="dialog" aria-modal="true" aria-label={review.title || review.name}>
      <button type="button" className="hagour-review-lightbox__backdrop" aria-label={t("close")} onClick={onClose} />
      <div className="hagour-review-lightbox__panel">
        <button type="button" className="hagour-review-lightbox__close" onClick={onClose} aria-label={t("close")}>
          <X className="h-5 w-5" />
        </button>
        {review.mediaType === ReviewMediaType.VIDEO && review.videoUrl ? (
          <video
            controls
            playsInline
            preload="metadata"
            poster={review.imageUrl ? resolvePublicAssetSrc(review.imageUrl) : undefined}
            className="hagour-review-lightbox__image"
            src={resolvePublicAssetSrc(review.videoUrl)}
          />
        ) : review.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvePublicAssetSrc(review.imageUrl)} alt={review.name} className="hagour-review-lightbox__image" />
        ) : null}
        <div className="hagour-review-lightbox__meta">
          {review.mediaType === ReviewMediaType.TEXT ? <StarRow rating={review.rating} /> : null}
          <p className="hagour-review-card__name">{review.name}</p>
          {review.title ? <p className="text-sm font-semibold text-white">{review.title}</p> : null}
          {review.comment ? <p className="max-w-2xl text-center text-sm leading-6 text-zinc-300">{review.comment}</p> : null}
        </div>
      </div>
    </div>
  );
}

function usePerView() {
  const [perView, setPerView] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setPerView(mq.matches ? 3 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return perView;
}

function ReviewsCarousel({
  reviews,
  onOpen,
}: {
  reviews: CustomerReviewItem[];
  onOpen: (review: CustomerReviewItem) => void;
}) {
  const { t } = useStoreI18n();
  const perView = usePerView();
  const slides = useMemo(() => {
    const chunks: CustomerReviewItem[][] = [];
    for (let i = 0; i < reviews.length; i += perView) {
      chunks.push(reviews.slice(i, i + perView));
    }
    return chunks;
  }, [reviews, perView]);

  const [index, setIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const slideCount = slides.length;

  useEffect(() => {
    const sync = () => setAutoRotate(document.documentElement.dataset.a11yStopAnimations !== "on");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-a11y-stop-animations"] });
    return () => observer.disconnect();
  }, []);

  const go = useCallback(
    (next: number) => {
      if (slideCount <= 0) return;
      setIndex(((next % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  useEffect(() => {
    setIndex((i) => (i >= slideCount ? 0 : i));
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1 || !autoRotate) return;
    const id = window.setInterval(() => go(index + 1), 6000);
    return () => window.clearInterval(id);
  }, [autoRotate, go, index, slideCount]);

  return (
    <div className="hagour-reviews-carousel mt-8 md:mt-10">
      {slideCount > 1 ? (
        <>
          <button
            type="button"
            className="hagour-reviews-carousel__arrow hagour-reviews-carousel__arrow--prev"
            onClick={() => go(index - 1)}
            aria-label={t("reviewsPrev")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hagour-reviews-carousel__arrow hagour-reviews-carousel__arrow--next"
            onClick={() => go(index + 1)}
            aria-label={t("reviewsNext")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      ) : null}

      <div
        className="hagour-reviews-carousel__track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((group, slideIdx) => (
          <div key={slideIdx} className="hagour-reviews-carousel__slide">
            {group.map((review) => (
              <ReviewCard key={review.id} review={review} onOpen={onOpen} />
            ))}
          </div>
        ))}
      </div>

      {slideCount > 1 ? (
        <div className="hagour-reviews-carousel__dots" role="tablist" aria-label={t("reviewsCarouselLabel")}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t("reviewsSlide").replace("{index}", String(i + 1))}
              className={`hagour-reviews-carousel__dot ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CustomerReviewsSection({ reviews }: { reviews: CustomerReviewItem[] }) {
  const { t } = useStoreI18n();
  const [lightbox, setLightbox] = useState<CustomerReviewItem | null>(null);

  if (reviews.length === 0) return null;

  // Carousel when multiple reviews: desktop packs 3/slide; mobile 1/slide with arrows + dots.
  const useCarousel = reviews.length > 1;

  return (
    <section id="customer-reviews" className="scroll-mt-28" aria-labelledby="customer-reviews-title">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-hagor-gold/90">HAGOUR BY WAEL</p>
        <h2 id="customer-reviews-title" className="mt-1 text-xl font-black text-white sm:text-2xl">
          {t("customerReviewsTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
          {t("customerReviewsSubtitle")}
        </p>
      </div>

      {useCarousel ? (
        <ReviewsCarousel reviews={reviews} onOpen={setLightbox} />
      ) : (
        <div className="hagour-reviews-grid mt-8 md:mt-10">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onOpen={setLightbox} />
          ))}
        </div>
      )}

      {lightbox ? <ReviewLightbox review={lightbox} onClose={() => setLightbox(null)} /> : null}
    </section>
  );
}
