export default function StoreLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-20">
      <span
        className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-blue-500"
        aria-hidden
      />
      <p className="text-sm text-slate-500">טוען…</p>
    </div>
  );
}
