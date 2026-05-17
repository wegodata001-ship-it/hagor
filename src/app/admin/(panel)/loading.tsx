export default function AdminPanelLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-10 text-center shadow-sm">
      <span
        className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
        aria-hidden
      />
      <p className="text-sm font-medium text-slate-600">Loading…</p>
    </div>
  );
}
