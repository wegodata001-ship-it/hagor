"use client";

import { useEffect, useRef } from "react";

export function AdminModal({
  open,
  title,
  children,
  footer,
  onClose,
  size = "md",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    size === "sm"
      ? "max-w-md"
      : size === "lg"
        ? "max-w-3xl"
        : size === "xl"
          ? "max-w-5xl"
          : "max-w-lg";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12 backdrop-blur-[1px]">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        aria-label="סגור"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-labelledby="admin-modal-title"
        className={`relative z-[101] w-full ${maxW} rounded-xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 id="admin-modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
