import Image from "next/image";
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
  return (
    <span className={`relative block h-full w-full ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
        className={className ?? "h-full w-full object-cover"}
      />
    </span>
  );
}
