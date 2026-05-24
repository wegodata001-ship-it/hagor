import {
  Check,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Hand,
  Headset,
  Home,
  LockKeyhole,
  Menu,
  Search,
  Shield,
  ShieldCheck,
  ShieldHalf,
  ShoppingCart,
  Target,
  Truck,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import type { HagourCategoryKey } from "@/lib/hagour-catalog";
import type { TacticalPlaceholderKind } from "@/lib/tactical-placeholders";

export type HagourIconSize = "trust" | "category" | "nav" | "lg";
export type TrustIconName = "truck" | "warranty" | "lock" | "headset";

const SIZE_CLASS: Record<HagourIconSize, string> = {
  trust: "hagour-icon hagour-icon--trust",
  category: "hagour-icon hagour-icon--category",
  nav: "hagour-icon hagour-icon--nav",
  lg: "hagour-icon hagour-icon--lg",
};

const TRUST_ICONS: Record<TrustIconName, LucideIcon> = {
  truck: Truck,
  warranty: BadgeCheck,
  lock: LockKeyhole,
  headset: Headset,
};

const CATEGORY_ICONS: Record<HagourCategoryKey, LucideIcon> = {
  belts: Shield,
  "pistol-holsters": Target,
  "weapon-holsters": ShieldHalf,
};

const NAV_ICONS = {
  home: Home,
  search: Search,
  cart: ShoppingCart,
  user: User,
  menu: Menu,
  close: X,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

function iconClass(size: HagourIconSize, extra?: string) {
  return [SIZE_CLASS[size], extra].filter(Boolean).join(" ");
}

export function HagourTrustIcon({
  name,
  size = "trust",
  className,
}: {
  name: TrustIconName;
  size?: HagourIconSize;
  className?: string;
}) {
  const Icon = TRUST_ICONS[name];
  return <Icon className={iconClass(size, className)} strokeWidth={1.8} aria-hidden />;
}

export function HagourCategoryIcon({
  categoryKey,
  className,
}: {
  categoryKey: HagourCategoryKey;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[categoryKey];
  return <Icon className={iconClass("category", className)} strokeWidth={1.8} aria-hidden />;
}

export function HagourPlaceholderIcon({ kind }: { kind: TacticalPlaceholderKind }) {
  const key: HagourCategoryKey =
    kind === "belts" || kind === "pistol-holsters" || kind === "weapon-holsters" ? kind : "belts";
  return <HagourCategoryIcon categoryKey={key} className="hagour-icon--lg" />;
}

export function HagourNavIcon({
  name,
  active,
  className,
}: {
  name: NavIconName;
  active?: boolean;
  className?: string;
}) {
  const Icon = NAV_ICONS[name];
  return (
    <Icon
      className={iconClass("nav", [active ? "text-white opacity-100" : "", className].filter(Boolean).join(" "))}
      strokeWidth={1.8}
      aria-hidden
    />
  );
}

export function HagourHandIcon({ side }: { side: "RIGHT" | "LEFT" }) {
  return (
    <Hand
      className={`hagour-icon hagour-icon--category ${side === "LEFT" ? "-scale-x-100" : ""}`}
      strokeWidth={1.8}
      aria-hidden
    />
  );
}

export function HagourDirectionArrow({ dir }: { dir: "rtl" | "ltr" }) {
  const Icon = dir === "rtl" ? ArrowLeft : ArrowRight;
  return <Icon className="inline h-3.5 w-3.5 align-middle text-current" strokeWidth={2} aria-hidden />;
}

export const TRUST_ICON_ITEMS: { name: TrustIconName; labelKey: "benefit1" | "benefit2" | "benefit3" | "benefit4" }[] = [
  { name: "truck", labelKey: "benefit1" },
  { name: "warranty", labelKey: "benefit2" },
  { name: "lock", labelKey: "benefit3" },
  { name: "headset", labelKey: "benefit4" },
];

export function HagourTrustRow({ labels }: { labels: string[] }) {
  const icons: TrustIconName[] = ["truck", "warranty", "lock", "headset"];
  return (
    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 md:grid-cols-4">
      {icons.map((name, i) => (
        <div
          key={name}
          className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5 text-center"
        >
          <span className="hagour-icon-bg" aria-hidden>
            <HagourTrustIcon name={name} />
          </span>
          <span>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function HagourCheckIcon({ className }: { className?: string }) {
  return <Check className={iconClass("category", className)} strokeWidth={2.2} aria-hidden />;
}
