import type { CSSProperties } from "react";

export type ProductGalleryPreset = "small" | "medium" | "large" | "custom";

export type GalleryDisplayConfig = {
  preset: ProductGalleryPreset;
  maxHeightPx: number | null;
  maxWidthPx: number | null;
};

export function normalizeGalleryPreset(v: string | null | undefined): ProductGalleryPreset {
  if (v === "small" || v === "medium" || v === "large" || v === "custom") return v;
  return "medium";
}

/** CSS max dimensions for main gallery column */
export function galleryMainMaxStyle(cfg: GalleryDisplayConfig): CSSProperties {
  const caps: Record<Exclude<ProductGalleryPreset, "custom">, { h: number; w: number }> = {
    small: { h: 320, w: 320 },
    medium: { h: 520, w: 520 },
    large: { h: 680, w: 680 },
  };

  if (cfg.preset === "custom") {
    const h = cfg.maxHeightPx ?? 520;
    const w = cfg.maxWidthPx ?? 520;
    return { maxHeight: Math.min(h, 1200), maxWidth: Math.min(w, 1200) };
  }

  const { h, w } = caps[cfg.preset];
  return { maxHeight: h, maxWidth: w };
}

export function galleryThumbSizeClass(cfg: GalleryDisplayConfig): string {
  switch (cfg.preset) {
    case "small":
      return "h-12 w-12 md:h-14 md:w-14";
    case "large":
      return "h-20 w-20 md:h-24 md:w-24";
    case "custom":
      return "h-16 w-16 md:h-[4.5rem] md:w-[4.5rem]";
    default:
      return "h-14 w-14 md:h-16 md:w-16";
  }
}
