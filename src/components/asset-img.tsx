import { resolvePublicAssetSrc } from "@/lib/assets-path";

export function AssetImg({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!path) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-300 ${className ?? ""}`}
      >
        <span className="rounded border border-zinc-500 px-2 py-1 text-xs text-zinc-400">IMG</span>
        <span className="text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Image Coming Soon
        </span>
      </div>
    );
  }
  const src = resolvePublicAssetSrc(path);
  return <img src={src} alt={alt} className={className} />;
}
