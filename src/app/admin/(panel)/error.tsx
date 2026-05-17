"use client";

import { useEffect } from "react";
import { runtimeLog } from "@/lib/runtime-log/client";

export default function AdminPanelError({
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
      message: "admin_panel_segment",
      error: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/90 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-red-900">This section failed to load</h2>
      <p className="mt-2 text-sm text-red-800/90">
        The admin navigation and layout are still available. Try again, or open another page and come back.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-red-100/80 p-3 text-xs text-red-950">{error.message}</pre>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Retry
        </button>
        <a
          href="/admin"
          className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100/60"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
