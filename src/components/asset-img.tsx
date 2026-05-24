import Image from "next/image";
import { resolvePublicAssetSrc } from "@/lib/assets-path";
import {
  getPlaceholderMeta,
  isBlockedDemoAsset,
  type TacticalPlaceholderKind,
} from "@/lib/tactical-placeholders";
import { HagourPlaceholderIcon } from "@/components/storefront/hagour-icon";

export function AssetImg({
  path,
  alt,
  className,
  placeholderKind = "default",
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  placeholderKind?: TacticalPlaceholderKind;
}) {
  const meta = getPlaceholderMeta(placeholderKind);
  const hasImage = !!path && !isBlockedDemoAsset(path);

  if (!hasImage) {
    return (
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden border border-zinc-800/80 ${className ?? ""}`}
        style={{
          background: `linear-gradient(145deg, ${meta.from} 0%, ${meta.via} 45%, ${meta.to} 100%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(200,146,17,0.12),transparent_55%)]" />
        <span className="relative hagour-icon-bg" aria-hidden>
          <HagourPlaceholderIcon kind={placeholderKind} />
        </span>
        <span className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-hagor-gold/90">{meta.labelHe}</span>
      </div>
    );
  }

  const src = resolvePublicAssetSrc(path!);
  return (
    <span className={`relative block h-full w-full overflow-hidden ${className ?? ""}`}>
      <Image src={src} alt={alt} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" className="object-cover" />
    </span>
  );
}
