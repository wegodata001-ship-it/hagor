"use client";

import Link from "next/link";
import { AssetImg } from "@/components/asset-img";

/** Storefront subcategory chip: touch-friendly, pill style, clear active state. */
export function SubcategoryPillLink({
  href,
  label,
  imageUrl,
  active,
}: {
  href: string;
  label: string;
  imageUrl?: string | null;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-[44px] max-w-full items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium leading-snug",
        "transition duration-200 ease-out",
        "motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400",
        active
          ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-950/40"
          : "border-zinc-600/85 bg-zinc-900/65 text-zinc-100 shadow-sm hover:border-hagor-gold/50 hover:bg-zinc-800/90 hover:text-white hover:shadow-md",
      ].join(" ")}
    >
      {imageUrl ? (
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/15 bg-zinc-950 ring-1 ring-black/25 sm:h-9 sm:w-9">
          <AssetImg path={imageUrl} alt="" className="h-full w-full object-cover" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-start">{label}</span>
    </Link>
  );
}
