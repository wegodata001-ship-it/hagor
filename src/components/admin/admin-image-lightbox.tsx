"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isRtl, useAdminI18n } from "@/lib/admin-i18n";

export type LightboxImage = {
  /** Stable key (e.g. DB id or blob URL). */
  key: string;
  /** Fully-resolved image `src` — Supabase URL, blob:, data:, or /public/… */
  src: string;
  /** Optional label used for download filename. */
  label?: string;
};

const ZOOM_LEVELS = [1, 1.25, 1.5, 2] as const;

/**
 * Admin image lightbox — portals above the AdminModal (z-[200]) with dark
 * overlay, keyboard nav, prev/next, thumbnail strip, and simple zoom.
 *
 * READ-ONLY: nothing here writes to DB or mutates the underlying image list.
 */
export function AdminImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
  title,
}: {
  images: LightboxImage[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  const { t, lang } = useAdminI18n();
  const rtl = isRtl(lang);

  const [index, setIndex] = useState(() => clampIndex(initialIndex, images.length));
  const [zoomStep, setZoomStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const thumbStripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Reset internal state when re-opened.
  useEffect(() => {
    if (!open) return;
    setIndex(clampIndex(initialIndex, images.length));
    setZoomStep(0);
  }, [open, initialIndex, images.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (images.length === 0 ? 0 : (i - 1 + images.length) % images.length));
    setZoomStep(0);
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (images.length === 0 ? 0 : (i + 1) % images.length));
    setZoomStep(0);
  }, [images.length]);

  // Keyboard: ESC / arrows / +/-  (capture phase — beats the AdminModal ESC).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.stopPropagation();
        e.preventDefault();
        // In RTL, "left" is visually next.
        (rtl ? goNext : goPrev)();
        return;
      }
      if (e.key === "ArrowRight") {
        e.stopPropagation();
        e.preventDefault();
        (rtl ? goPrev : goNext)();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoomStep((z) => Math.min(z + 1, ZOOM_LEVELS.length - 1));
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoomStep((z) => Math.max(z - 1, 0));
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        setZoomStep(0);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose, goPrev, goNext, rtl]);

  // Body scroll lock — preserves scroll position when closing.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // Focus management: focus close button on open, restore on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Focus close after paint.
    const raf = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Basic focus trap — Tab stays within the lightbox.
  useEffect(() => {
    if (!open) return;
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onTab, true);
    return () => document.removeEventListener("keydown", onTab, true);
  }, [open]);

  // Scroll the active thumbnail into view.
  useEffect(() => {
    if (!open) return;
    const strip = thumbStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index, open]);

  const current = images[index];
  const zoom = ZOOM_LEVELS[zoomStep];

  const downloadName = useMemo(() => {
    if (!current) return "image.jpg";
    if (current.label) return sanitizeFilename(current.label);
    try {
      const u = new URL(current.src, "https://x");
      const last = u.pathname.split("/").pop() || "image.jpg";
      return sanitizeFilename(last);
    } catch {
      return "image.jpg";
    }
  }, [current]);

  if (!mounted || !open || !current) return null;

  // In RTL the "prev" chevron should point right and be placed on the right.
  const prevIcon = rtl ? "›" : "‹";
  const nextIcon = rtl ? "‹" : "›";

  const overlay = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal
      aria-label={t("imageLightboxOpen")}
      dir={rtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-sm"
      onWheel={(e) => {
        // Wheel zoom — in/out.
        if (e.deltaY < 0) setZoomStep((z) => Math.min(z + 1, ZOOM_LEVELS.length - 1));
        else if (e.deltaY > 0) setZoomStep((z) => Math.max(z - 1, 0));
      }}
    >
      {/* Backdrop — clicking outside the image closes. */}
      <button
        type="button"
        aria-label={t("imageLightboxClose")}
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
        <div className="min-w-0 truncate text-sm font-medium sm:text-base">
          {title ?? current.label ?? " "}
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t("imageLightboxClose")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      {/* Image area */}
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-6">
        {images.length > 1 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label={t("imageLightboxPrev")}
            className="absolute start-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-2xl text-white transition hover:bg-white/20 sm:start-6 sm:p-3"
          >
            <span aria-hidden>{prevIcon}</span>
          </button>
        )}

        <div
          className="pointer-events-none flex h-full max-h-[88vh] w-full max-w-[90vw] items-center justify-center overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/*
            eslint-disable-next-line @next/next/no-img-element
            Using <img> here (not next/image) because sources can be blob:/data:
            (unsaved uploads) which next/image doesn't optimize, and we want the
            browser-native intrinsic sizing for `object-fit: contain`.
          */}
          <img
            key={current.key}
            src={current.src}
            alt=""
            draggable={false}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            className="pointer-events-auto max-h-[88vh] max-w-[90vw] select-none object-contain transition-transform duration-150"
          />
        </div>

        {images.length > 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label={t("imageLightboxNext")}
            className="absolute end-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-2xl text-white transition hover:bg-white/20 sm:end-6 sm:p-3"
          >
            <span aria-hidden>{nextIcon}</span>
          </button>
        )}
      </div>

      {/* Bottom bar: counter + zoom + download + thumbs */}
      <div className="relative z-10 flex flex-col gap-3 border-t border-white/10 px-4 py-3 text-white sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label={t("imageLightboxPrev")}
                  className="rounded-full px-2 py-0.5 hover:bg-white/10"
                >
                  {prevIcon}
                </button>
                <span className="font-mono" dir="ltr">
                  {index + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label={t("imageLightboxNext")}
                  className="rounded-full px-2 py-0.5 hover:bg-white/10"
                >
                  {nextIcon}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setZoomStep((z) => Math.max(z - 1, 0))}
              disabled={zoomStep === 0}
              aria-label={t("imageLightboxZoomOut")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center font-mono text-xs" dir="ltr">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomStep((z) => Math.min(z + 1, ZOOM_LEVELS.length - 1))}
              disabled={zoomStep === ZOOM_LEVELS.length - 1}
              aria-label={t("imageLightboxZoomIn")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoomStep(0)}
              disabled={zoomStep === 0}
              className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20 disabled:opacity-40"
            >
              {t("imageLightboxZoomReset")}
            </button>
            {isDirectlyDownloadable(current.src) && (
              <a
                href={current.src}
                download={downloadName}
                target="_blank"
                rel="noreferrer"
                aria-label={t("imageLightboxDownload")}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-xs hover:bg-white/20"
              >
                ⬇ {t("imageLightboxDownload")}
              </a>
            )}
          </div>
        </div>

        {images.length > 1 && (
          <div
            ref={thumbStripRef}
            className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1"
          >
            {images.map((im, i) => (
              <button
                key={im.key}
                type="button"
                data-idx={i}
                onClick={() => {
                  setIndex(i);
                  setZoomStep(0);
                }}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition sm:h-16 sm:w-16 ${
                  i === index ? "border-white" : "border-white/20 hover:border-white/60"
                }`}
                aria-label={`${i + 1}`}
                aria-current={i === index}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.src} alt="" className="h-full w-full object-cover" draggable={false} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return Math.max(0, Math.min(i, len - 1));
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120) || "image.jpg";
}

/** Blob/data URLs and same-origin/public URLs can be downloaded natively. */
function isDirectlyDownloadable(src: string): boolean {
  if (src.startsWith("blob:") || src.startsWith("data:")) return true;
  if (src.startsWith("/")) return true;
  if (src.startsWith("http://") || src.startsWith("https://")) return true;
  return false;
}
