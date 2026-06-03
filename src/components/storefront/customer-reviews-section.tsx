"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePublicAssetSrc } from "@/lib/assets-path";
import { useStoreI18n } from "@/components/storefront/store-i18n";

export type CustomerReviewItem = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
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

function ReviewAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolvePublicAssetSrc(imageUrl)} alt={name} className="hagour-review-avatar" loading="lazy" />
    );
  }
  const initial = name.trim().charAt(0) || "?";
  return (
    <div className="hagour-review-avatar hagour-review-avatar--placeholder" aria-hidden>
      {initial}
    </div>
  );
}

function ReviewCard({ review }: { review: CustomerReviewItem }) {
  const lines = review.comment.split("\n").filter(Boolean);
  return (
    <article className="hagour-review-card">
      <ReviewAvatar name={review.name} imageUrl={review.imageUrl} />
      <StarRow rating={review.rating} />
      <p className="hagour-review-card__name">{review.name}</p>
      <blockquote className="hagour-review-card__quote">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </blockquote>
    </article>
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

function ReviewsCarousel({ reviews }: { reviews: CustomerReviewItem[] }) {
  const perView = usePerView();
  const slides = useMemo(() => {
    const chunks: CustomerReviewItem[][] = [];
    for (let i = 0; i < reviews.length; i += perView) {
      chunks.push(reviews.slice(i, i + perView));
    }
    return chunks;
  }, [reviews, perView]);

  const [index, setIndex] = useState(0);
  const slideCount = slides.length;

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
    if (slideCount <= 1) return;
    const id = window.setInterval(() => go(index + 1), 5000);
    return () => window.clearInterval(id);
  }, [go, index, slideCount]);

  return (
    <div className="hagour-reviews-carousel mt-8 md:mt-10">
      <div
        className="hagour-reviews-carousel__track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((group, slideIdx) => (
          <div key={slideIdx} className="hagour-reviews-carousel__slide">
            {group.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ))}
      </div>
      {slideCount > 1 ? (
        <div className="hagour-reviews-carousel__dots" role="tablist" aria-label="חוות דעת">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`מקטע ${i + 1}`}
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
  if (reviews.length === 0) return null;

  const useCarousel = reviews.length > 3;

  return (
    <section id="customer-reviews" className="scroll-mt-28" aria-labelledby="customer-reviews-title">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-hagor-gold/90">HAGOUR</p>
        <h2 id="customer-reviews-title" className="mt-1 text-xl font-black text-white sm:text-2xl">
          {t("customerReviewsTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
          {t("customerReviewsSubtitle")}
        </p>
      </div>
      {useCarousel ? (
        <ReviewsCarousel reviews={reviews} />
      ) : (
        <div className="hagour-reviews-grid mt-8 md:mt-10">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}
