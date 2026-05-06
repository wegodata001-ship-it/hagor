export function AdminSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 ${className}`}
      aria-hidden
    />
  );
}
