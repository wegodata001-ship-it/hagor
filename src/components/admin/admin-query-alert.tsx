"use client";

export function AdminQueryAlert({ error, hint }: { error: string | null; hint?: string | null }) {
  if (!error && !hint) return null;
  return (
    <div className="mb-4 space-y-2">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">לא נטענו נתונים מהמסד</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}
      {hint ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{hint}</div> : null}
    </div>
  );
}
