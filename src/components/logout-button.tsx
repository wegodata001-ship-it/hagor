"use client";

export function LogoutButton({ label = "התנתקות" }: { label?: string }) {
  return (
    <button
      type="button"
      className="hover:text-zinc-900"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      {label}
    </button>
  );
}
