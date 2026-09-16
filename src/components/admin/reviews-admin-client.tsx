"use client";

import { ReviewMediaType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { AssetImg } from "@/components/asset-img";
import { deleteReview, upsertReview } from "@/app/admin/actions";
import { uploadAdminAsset } from "@/lib/admin-upload-client";
import { useAdminI18n } from "@/lib/admin-i18n";
import { resolvePublicAssetSrc } from "@/lib/assets-path";

export type ReviewDTO = {
  id: string;
  mediaType: ReviewMediaType;
  name: string;
  title: string | null;
  rating: number;
  comment: string;
  imageUrl: string | null;
  videoUrl: string | null;
  isApproved: boolean;
  sortOrder: number;
  createdAt: string;
};

export function ReviewsAdminClient({ reviews }: { reviews: ReviewDTO[] }) {
  const router = useRouter();
  const { t } = useAdminI18n();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ReviewDTO | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  async function submit(form: HTMLFormElement, files: { imageFile: File | null; videoFile: File | null }) {
    setSaving(true);
    try {
      const fd = new FormData(form);
      if (files.imageFile) {
        const reviewId = (form.elements.namedItem("id") as HTMLInputElement)?.value?.trim();
        const entityId = reviewId || `review-${Date.now()}`;
        const path = await uploadAdminAsset(files.imageFile, "reviews", {
          entityId,
          originalName: files.imageFile.name || `${entityId}.jpg`,
        });
        fd.set("imageUrl", path);
      }
      if (files.videoFile) {
        const reviewId = (form.elements.namedItem("id") as HTMLInputElement)?.value?.trim();
        const entityId = reviewId || `review-${Date.now()}`;
        const path = await uploadAdminAsset(files.videoFile, "reviews", {
          entityId,
          originalName: files.videoFile.name || `${entityId}.mp4`,
          compress: false,
        });
        fd.set("videoUrl", path);
      }
      const res = await upsertReview(fd);
      if (!res.ok) setToast(res.error ?? t("errorGeneric"));
      else {
        setToast(t("savedSuccessfully"));
        setOpen(false);
        setEdit(null);
        refresh();
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {toast ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("reviewsAdmin")}</h1>
          <p className="text-sm text-slate-500">{t("reviewsAdminSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t("addReview")}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-4 py-3">{t("reviewType")}</th>
              <th className="px-4 py-3">{t("reviewImage")}</th>
              <th className="px-4 py-3 text-start">{t("reviewerName")}</th>
              <th className="px-4 py-3 text-start">{t("reviewTitle")}</th>
              <th className="px-4 py-3">{t("rating")}</th>
              <th className="px-4 py-3 text-start">{t("comment")}</th>
              <th className="px-4 py-3">{t("approved")}</th>
              <th className="px-4 py-3">{t("sortOrder")}</th>
              <th className="px-4 py-3 text-end">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  {t("noReviewsYet")}
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-top">
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${r.mediaType === ReviewMediaType.VIDEO ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                      {r.mediaType === ReviewMediaType.VIDEO ? t("reviewTypeVideo") : t("reviewTypeText")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.imageUrl ? (
                      <div className={`relative h-12 w-12 overflow-hidden border border-slate-200 ${r.mediaType === ReviewMediaType.VIDEO ? "rounded-xl" : "rounded-full"}`}>
                        <AssetImg path={r.imageUrl} alt={r.name} className="h-full w-full" />
                        {r.mediaType === ReviewMediaType.VIDEO ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-lg text-white" aria-hidden>
                            ▶
                          </span>
                        ) : null}
                      </div>
                    ) : r.mediaType === ReviewMediaType.VIDEO ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-white">▶</div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="max-w-[180px] px-4 py-3 text-slate-600">
                    <p className="line-clamp-2 whitespace-pre-wrap">{r.title ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{r.mediaType === ReviewMediaType.TEXT ? `${r.rating}★` : "—"}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    <p className="line-clamp-3 whitespace-pre-wrap">{r.comment}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{r.isApproved ? t("yes") : t("no")}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{r.sortOrder}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => setEdit(r)}
                    >
                      {t("edit")}
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={async () => {
                        if (!confirm(t("deleteReviewConfirm"))) return;
                        const fd = new FormData();
                        fd.set("id", r.id);
                        const res = await deleteReview(fd);
                        if (!res.ok) setToast(res.error ?? t("errorGeneric"));
                        else {
                          setToast(t("deletedSuccessfully"));
                          refresh();
                        }
                      }}
                    >
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pending || saving ? (
        <div className="fixed bottom-6 left-6 z-[90] rounded-lg bg-slate-900 px-3 py-2 text-white">
          <AdminSpinner className="h-4 w-4 border-t-white" />
        </div>
      ) : null}

      <AdminModal open={open} onClose={() => setOpen(false)} title={t("addReview")}>
        <ReviewForm onSubmit={(f, files) => void submit(f, files)} onCancel={() => setOpen(false)} />
      </AdminModal>

      <AdminModal open={!!edit} onClose={() => setEdit(null)} title={t("editReview")}>
        {edit ? (
          <ReviewForm review={edit} onSubmit={(f, files) => void submit(f, files)} onCancel={() => setEdit(null)} />
        ) : null}
      </AdminModal>
    </div>
  );
}

function ReviewForm({
  review,
  onSubmit,
  onCancel,
}: {
  review?: ReviewDTO;
  onSubmit: (form: HTMLFormElement, files: { imageFile: File | null; videoFile: File | null }) => void;
  onCancel: () => void;
}) {
  const { t } = useAdminI18n();
  const [mediaType, setMediaType] = useState<ReviewMediaType>(review?.mediaType ?? ReviewMediaType.TEXT);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(review?.imageUrl ?? "");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState(review?.videoUrl ?? "");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [previewUrl, videoPreviewUrl]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const form = e.currentTarget;
        const imageInput = form.elements.namedItem("imageFile") as HTMLInputElement;
        const videoInput = form.elements.namedItem("videoFile") as HTMLInputElement;
        await onSubmit(form, {
          imageFile: imageInput?.files?.[0] ?? null,
          videoFile: videoInput?.files?.[0] ?? null,
        });
        setPending(false);
      }}
    >
      {review ? <input type="hidden" name="id" value={review.id} /> : null}
      <input type="hidden" name="mediaType" value={mediaType} />
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="videoUrl" value={videoUrl} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">{t("reviewType")}</legend>
        <div className="flex flex-wrap gap-2">
          {[ReviewMediaType.TEXT, ReviewMediaType.VIDEO].map((type) => (
            <label key={type} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${mediaType === type ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
              <input
                type="radio"
                name="mediaTypeChoice"
                value={type}
                checked={mediaType === type}
                onChange={() => setMediaType(type)}
                className="sr-only"
              />
              <span>{type === ReviewMediaType.VIDEO ? t("reviewTypeVideo") : t("reviewTypeText")}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium text-slate-700">
        {t("reviewerName")}
        <input
          name="name"
          required
          defaultValue={review?.name ?? ""}
          className="ds-input mt-1 w-full"
          placeholder="רועי ש."
        />
      </label>

      {mediaType === ReviewMediaType.VIDEO ? (
        <label className="block text-sm font-medium text-slate-700">
          {t("reviewTitle")}
          <input name="title" required defaultValue={review?.title ?? ""} className="ds-input mt-1 w-full" />
        </label>
      ) : (
        <label className="block text-sm font-medium text-slate-700">
          {t("rating")}
          <select name="rating" defaultValue={String(review?.rating ?? 5)} className="ds-input mt-1 w-full">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm font-medium text-slate-700">
        {mediaType === ReviewMediaType.VIDEO ? t("reviewShortDescription") : t("comment")}
        <textarea
          name="comment"
          required={mediaType === ReviewMediaType.TEXT}
          rows={4}
          defaultValue={review?.comment ?? ""}
          className="ds-input mt-1 w-full"
        />
      </label>

      {mediaType === ReviewMediaType.VIDEO ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <span className="block text-sm font-medium text-slate-700">{t("reviewVideo")}</span>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              <input
                name="videoFile"
                type="file"
                accept="video/mp4,video/webm"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                  if (file) setVideoPreviewUrl(URL.createObjectURL(file));
                  else setVideoPreviewUrl(null);
                }}
              />
              {videoUrl || videoPreviewUrl ? t("replaceVideo") : t("chooseVideo")}
            </label>
          </div>

          {videoPreviewUrl || videoUrl ? (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{t("videoPreview")}</p>
              <video
                controls
                preload="metadata"
                playsInline
                poster={previewUrl || imageUrl ? resolvePublicAssetSrc(previewUrl || imageUrl) : undefined}
                className="w-full rounded-xl bg-black"
                src={videoPreviewUrl ? videoPreviewUrl : resolvePublicAssetSrc(videoUrl)}
              />
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => {
                  if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                  setVideoPreviewUrl(null);
                  setVideoUrl("");
                }}
              >
                {t("removeVideo")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <span className="block text-sm font-medium text-slate-700">
          {mediaType === ReviewMediaType.VIDEO ? t("reviewCoverImage") : t("reviewImage")}
        </span>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
          <input
            name="imageFile"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              if (file) {
                setPreviewUrl(URL.createObjectURL(file));
              } else {
                setPreviewUrl(null);
              }
            }}
          />
          {t("chooseImage")}
        </label>
      </div>

      {previewUrl || imageUrl ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">{t("imagePreview")}</p>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className={`border-2 border-amber-400/50 object-cover ${mediaType === ReviewMediaType.VIDEO ? "h-24 w-full max-w-xs rounded-xl" : "h-20 w-20 rounded-full"}`}
            />
          ) : (
            <div className={`relative overflow-hidden border-2 border-amber-400/50 ${mediaType === ReviewMediaType.VIDEO ? "h-24 w-full max-w-xs rounded-xl" : "h-20 w-20 rounded-full"}`}>
              <AssetImg path={imageUrl} alt="" className="h-full w-full" />
            </div>
          )}
          <button
            type="button"
            className="text-xs text-red-600 hover:underline"
            onClick={() => {
              setImageUrl("");
              setPreviewUrl(null);
            }}
          >
            {t("removeImage")}
          </button>
        </div>
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        {t("sortOrder")}
        <input
          name="sortOrder"
          type="number"
          defaultValue={review?.sortOrder ?? 0}
          className="ds-input mt-1 w-full"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isApproved" defaultChecked={review?.isApproved ?? true} value="on" />
        {t("showOnSite")}
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
          {t("cancel")}
        </button>
        <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          {t("save")}
        </button>
      </div>
    </form>
  );
}
