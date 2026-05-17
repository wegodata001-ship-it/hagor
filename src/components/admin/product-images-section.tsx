"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AssetImg } from "@/components/asset-img";
import { useAdminI18n } from "@/lib/admin-i18n";
import { uploadAdminAsset } from "@/lib/admin-upload-client";
import {
  deleteProductImage,
  replaceProductImage,
  setMainProductImage,
  setProductImageOrder,
} from "@/app/admin/actions";
import { compressImageForUpload, rotateImageFromUrl90CW } from "@/lib/image-compress-client";
import {
  galleryMainMaxStyle,
  galleryThumbSizeClass,
  type GalleryDisplayConfig,
} from "@/lib/product-gallery-display";
import { resolvePublicAssetSrc } from "@/lib/assets-path";

export type Img = { id: string; url: string; isMain: boolean; sortOrder: number };

function sortImages(im: Img[]): Img[] {
  return [...im].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

export function ProductImagesSection({
  product,
  galleryDisplay,
  selectedFiles,
  setSelectedFiles,
  onRefresh,
}: {
  product: { id: string; images: Img[] } | null;
  galleryDisplay: GalleryDisplayConfig;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  onRefresh?: () => void;
}) {
  const { t } = useAdminI18n();
  const fileInputId = useId();
  const [ordered, setOrdered] = useState<Img[]>(() => sortImages(product?.images ?? []));
  const [activeIdx, setActiveIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [dragId, setDragId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const next = sortImages(product?.images ?? []);
    setOrdered(next);
    setActiveIdx((i) => Math.min(i, Math.max(0, next.length - 1)));
  }, [product?.images]);

  const active = ordered[activeIdx] ?? null;
  const mainStyle = galleryMainMaxStyle(galleryDisplay);
  const thumbClass = galleryThumbSizeClass(galleryDisplay);

  const onDropFiles = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) return;
      setSelectedFiles([...selectedFiles, ...arr]);
    },
    [selectedFiles, setSelectedFiles],
  );

  const persistOrder = useCallback(
    async (next: Img[]) => {
      if (!product) return;
      const fd = new FormData();
      fd.append("productId", product.id);
      fd.append("orderedIds", JSON.stringify(next.map((x) => x.id)));
      const res = await setProductImageOrder(fd);
      if (!res.ok) throw new Error(res.error);
      onRefresh?.();
    },
    [product, onRefresh],
  );

  const handleDropReorder = async (targetId: string) => {
    if (!dragId || dragId === targetId || !product) return;
    const ids = ordered.map((x) => x.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, moved);
    const byId = new Map(ordered.map((x) => [x.id, x]));
    const next = nextIds.map((id, idx) => {
      const row = byId.get(id)!;
      return { ...row, sortOrder: idx };
    });
    setOrdered(next);
    setDragId(null);
    try {
      await persistOrder(next);
    } catch {
      setOrdered(sortImages(product.images));
    }
  };

  const runReplaceUpload = async (imageId: string, file: File) => {
    if (!product) return;
    setBusyId(imageId);
    try {
      let uploadFile = file;
      try {
        uploadFile = await compressImageForUpload(file);
      } catch (e) {
        if (e instanceof Error && e.message === "FILE_TOO_LARGE") throw e;
      }
      const path = await uploadAdminAsset(uploadFile, "products", {
        entityId: product.id,
        originalName: file.name,
        compress: false,
      });
      const fd = new FormData();
      fd.append("imageId", imageId);
      fd.append("url", path);
      const res = await replaceProductImage(fd);
      if (!res.ok) throw new Error(res.error);
      onRefresh?.();
    } finally {
      setBusyId(null);
    }
  };

  const previews = useMemo(
    () => selectedFiles.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [selectedFiles],
  );

  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">{t("productImagesLabel")}</div>
          <p className="text-xs text-slate-500">{t("productImagesStudioHint")}</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${previewMode === "desktop" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setPreviewMode("desktop")}
          >
            {t("previewDesktop")}
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${previewMode === "mobile" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setPreviewMode("mobile")}
          >
            {t("previewMobile")}
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-6 transition hover:border-blue-400 hover:bg-blue-50/30"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDropFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          id={fileInputId}
          onChange={(e) => {
            const f = e.currentTarget.files;
            if (f?.length) onDropFiles(f);
            e.currentTarget.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-slate-700">{t("dropImagesHere")}</p>
          <label
            htmlFor={fileInputId}
            className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t("chooseImages")}
          </label>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4">
          <span className="text-xs font-semibold text-emerald-900">
            {t("pendingUploads")} ({selectedFiles.length}) — {t("pendingUploadsSaveHint")}
          </span>
          <ul className="mt-3 flex flex-wrap gap-3">
            {previews.map((p) => (
              <li key={p.url}>
                <Image
                  src={p.url}
                  alt=""
                  width={88}
                  height={88}
                  className="h-20 w-20 rounded-lg border border-emerald-200 object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {product && ordered.length > 0 && (
        <div className={previewMode === "mobile" ? "mx-auto max-w-[360px]" : ""}>
          <div className="grid gap-4 lg:grid-cols-[minmax(80px,96px)_minmax(0,1fr)_minmax(0,220px)]">
            <div className="flex flex-row gap-2 overflow-x-auto pb-1 lg:max-h-[420px] lg:flex-col lg:overflow-y-auto lg:pb-0">
              {ordered.map((im, idx) => (
                <button
                  key={im.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragId(im.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handleDropReorder(im.id)}
                  onClick={() => setActiveIdx(idx)}
                  className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition ${thumbClass} ${
                    idx === activeIdx ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-200"
                  }`}
                >
                  <div className="relative h-full w-full min-h-[3rem] min-w-[3rem]">
                    <AssetImg path={im.url} alt="" className="object-cover" />
                  </div>
                  {im.isMain && (
                    <span className="absolute bottom-0 left-0 right-0 bg-blue-600/90 py-0.5 text-center text-[10px] font-bold text-white">
                      {t("main")}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div
              className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100"
              style={mainStyle}
            >
              {active && (
                <div className="relative h-full w-full min-h-[240px] p-2">
                  <AssetImg
                    path={active.url}
                    alt=""
                    className="max-h-[min(68vh,680px)] w-full object-contain transition duration-300 hover:scale-[1.01]"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("imageActions")}</div>
              {active && (
                <>
                  <button
                    type="button"
                    disabled={busyId === active.id}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("productId", product.id);
                      fd.append("imageId", active.id);
                      const res = await setMainProductImage(fd);
                      if (res.ok) onRefresh?.();
                    }}
                  >
                    ★ {t("setAsMainImage")}
                  </button>
                  <label className="block w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">
                    ↻ {t("replaceImage")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        await runReplaceUpload(active.id, f);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busyId === active.id}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                    onClick={async () => {
                      try {
                        const rotated = await rotateImageFromUrl90CW(resolvePublicAssetSrc(active.url));
                        await runReplaceUpload(active.id, rotated);
                      } catch {
                        /* CORS or load — ignore */
                      }
                    }}
                  >
                    ⟳ {t("rotate90")}
                  </button>
                  <a
                    href={resolvePublicAssetSrc(active.url)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    ⬇ {t("downloadImage")}
                  </a>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-red-200 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("imageId", active.id);
                      const res = await deleteProductImage(fd);
                      if (res.ok) onRefresh?.();
                    }}
                  >
                    ✕ {t("deleteShort")}
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{t("dragReorderHint")}</p>
        </div>
      )}
    </div>
  );
}
