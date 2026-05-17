"use client";

import { useEffect } from "react";
import Link from "next/link";
import { runtimeLog } from "@/lib/runtime-log/client";

export default function StoreSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    runtimeLog({
      level: "error",
      scope: "error_boundary",
      message: "store_segment",
      error: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="ds-card-glass border-red-500/30 p-8">
        <h1 className="text-xl font-semibold text-slate-50">משהו השתבש</h1>
        <p className="mt-3 text-sm text-slate-400">
          לא הצלחנו לטעון את העמוד. נסו שוב — הניווט למעלה עדיין זמין.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-500"
          >
            נסו שוב
          </button>
          <Link href="/" className="text-sm text-blue-400 hover:underline">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
