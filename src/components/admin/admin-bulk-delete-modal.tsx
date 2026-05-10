"use client";

import { useEffect, useState } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { AdminSpinner } from "@/components/admin/admin-spinner";

const PHRASE = "DELETE";

export function AdminBulkDeleteModal({
  open,
  onClose,
  title,
  description,
  typeDeleteHint,
  cancelLabel,
  confirmLabel,
  pending,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  typeDeleteHint: string;
  cancelLabel: string;
  confirmLabel: string;
  pending: boolean;
  onConfirmed: (typedPhrase: string) => Promise<void>;
}) {
  const [phrase, setPhrase] = useState("");
  const okPhrase = phrase.trim() === PHRASE;

  useEffect(() => {
    if (!open) setPhrase("");
  }, [open]);

  return (
    <AdminModal open={open} onClose={pending ? () => {} : onClose} title={title} size="md">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-700">{description}</p>
        <div>
          <label className="block text-xs font-medium text-slate-600">{typeDeleteHint}</label>
          <input
            type="text"
            autoComplete="off"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={PHRASE}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-[0_0_0_1px_rgba(239,68,68,0.15)] placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/25"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending || !okPhrase}
            onClick={() => void onConfirmed(phrase.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.55)] hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending && <AdminSpinner className="h-4 w-4 border-t-white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
