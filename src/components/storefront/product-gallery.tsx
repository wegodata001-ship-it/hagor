"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AssetImg } from "@/components/asset-img";

export function ProductGallery({
  images,
  title,
}: {
  images: { id: string; url: string }[];
  title: string;
}) {
  const safe = useMemo(() => images.filter((i) => !!i.url), [images]);
  const [selected, setSelected] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const current = safe[selected] ?? safe[0];
  const sig = useMemo(() => safe.map((i) => i.url).join("|"), [safe]);

  useEffect(() => {
    setSelected(0);
  }, [sig]);
  const move = (next: number) => {
    if (safe.length === 0) return;
    const normalized = (next + safe.length) % safe.length;
    setSelected(normalized);
  };
  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black"
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
        <div className="aspect-square">
          <AssetImg path={current?.url ?? null} alt={title} className="h-full w-full object-cover" />
        </div>
        {safe.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(selected - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-black/60 px-2 py-1 text-zinc-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => move(selected + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-black/60 px-2 py-1 text-zinc-100"
            >
              ›
            </button>
          </>
        )}
      </div>
      {safe.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {safe.map((img, idx) => (
            <button
              type="button"
              key={img.id}
              onClick={() => setSelected(idx)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border ${
                idx === selected ? "border-orange-500" : "border-zinc-800"
              }`}
            >
              <AssetImg path={img.url} alt={title} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
