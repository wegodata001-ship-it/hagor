export type TacticalPlaceholderKind = "belts" | "pistol-holsters" | "weapon-holsters" | "default";

const KIND_META: Record<
  TacticalPlaceholderKind,
  { labelHe: string; from: string; via: string; to: string }
> = {
  belts: {
    labelHe: "חגורות",
    from: "#1a1814",
    via: "#2e2818",
    to: "#0b0b0b",
  },
  "pistol-holsters": {
    labelHe: "נרתיקים לאקדח",
    from: "#181614",
    via: "#2a2418",
    to: "#0b0b0b",
  },
  "weapon-holsters": {
    labelHe: "נרתיקים לנשק",
    from: "#141614",
    via: "#242a18",
    to: "#0b0b0b",
  },
  default: {
    labelHe: "HAGOUR",
    from: "#141414",
    via: "#252018",
    to: "#0b0b0b",
  },
};

export function categoryKeyFromId(categoryId: string | null | undefined): TacticalPlaceholderKind {
  if (!categoryId) return "default";
  const match = categoryId.match(/-cat-([a-z0-9-]+)$/i);
  const key = match?.[1];
  if (key && key in KIND_META) return key as TacticalPlaceholderKind;
  return "default";
}

export function getPlaceholderMeta(kind?: TacticalPlaceholderKind | null) {
  return KIND_META[kind && kind in KIND_META ? kind : "default"];
}

/** Block legacy BASE / electronics asset paths from hero and promos. */
export function isBlockedDemoAsset(path: string | null | undefined): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  const blocked = [
    "iphone",
    "laptop",
    "computer",
    "headphones",
    "electronics",
    "phone",
    "phones",
    "tablet",
    "macbook",
    "desigma",
    "demo",
    "base/",
    "/hero.png",
  ];
  return blocked.some((b) => lower.includes(b));
}

export function resolveHeroBackground(path: string | null | undefined, fallback = "/hagor-hero-fallback.svg"): string {
  if (!path || isBlockedDemoAsset(path)) return fallback;
  return path;
}
