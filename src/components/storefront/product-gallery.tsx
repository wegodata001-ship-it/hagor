"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AssetImg } from "@/components/asset-img";
import { HagourNavIcon } from "@/components/storefront/hagour-icon";

export function ProductGallery({
  images,
  title,
}: {
  images: { id: string; url: string }[];
  title: string;
}) {
  const safe = useMemo(() => images.filter((i) => !!i.url), [images]);
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const current = safe[selected] ?? safe[0];
  const sig = useMemo(() => safe.map((i) => i.url).join("|"), [safe]);

  useEffect(() => {
    setSelected(0);
  }, [sig]);

  const move = (next: number) => {
    if (safe.length === 0) return;
    setSelected((next + safe.length) % safe.length);
  };

  return (
    <div className="flex gap-3 lg:flex-row">
      {safe.length > 1 ? (
        <div className="hidden max-h-[620px] w-[78px] shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
          {safe.map((img, idx) => (
            <button
              type="button"
              key={img.id}
              onClick={() => setSelected(idx)}
              className={`h-[78px] w-[78px] shrink-0 overflow-hidden rounded-xl border ${
                idx === selected ? "border-[#d3a20e]" : "border-[rgba(212,160,23,0.18)]"
              }`}
            >
              <AssetImg path={img.url} alt={title} className="h-full w-full object-contain bg-[#0d0d0d]" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 space-y-3">
        <div
          className="relative overflow-hidden rounded-[18px] border border-[rgba(201,148,0,0.20)] bg-[#0d0d0d]"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const dx = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) < 40) return;
            if (dx < 0) move(selected + 1);
            else move(selected - 1);
          }}
        >
          <button
            type="button"
            onClick={() => current && setLightbox(true)}
            className="block w-full"
            aria-label="zoom"
          >
            <div className="mx-auto aspect-square w-full max-w-[min(100%,620px)]">
              <AssetImg
                path={current?.url ?? null}
                alt={title}
                className="h-full w-full object-contain"
              />
            </div>
          </button>
          {safe.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => move(selected - 1)}
                className="absolute start-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/60 text-sm text-zinc-100"
                aria-label="previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => move(selected + 1)}
                className="absolute end-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-black/60 text-sm text-zinc-100"
                aria-label="next"
              >
                ›
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => current && setLightbox(true)}
            className="absolute end-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-black/60 text-zinc-100"
            aria-label="zoom"
          >
            <HagourNavIcon name="search" />
          </button>
        </div>

        {safe.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            {safe.map((img, idx) => (
              <button
                type="button"
                key={img.id}
                onClick={() => setSelected(idx)}
                className={`h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border ${
                  idx === selected ? "border-[#d3a20e]" : "border-[rgba(212,160,23,0.18)]"
                }`}
              >
                <AssetImg path={img.url} alt={title} className="h-full w-full object-contain bg-[#0d0d0d]" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightbox && current ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute end-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-white"
            aria-label="close"
            onClick={() => setLightbox(false)}
          >
            <HagourNavIcon name="close" />
          </button>
          <div className="max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <AssetImg path={current.url} alt={title} className="max-h-[90vh] w-auto object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
