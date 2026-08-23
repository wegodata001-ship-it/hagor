import Link from "next/link";

export function PrivacyPolicyLink({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-zinc-500 ${className}`.trim()}>
      <Link href="/privacy" className="text-hagor-gold underline-offset-2 hover:underline">
        מדיניות פרטיות
      </Link>
    </p>
  );
}
