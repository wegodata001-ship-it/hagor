"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminI18n } from "@/lib/admin-i18n";

const LINKS = [
  { href: "/admin/content/terms", label: "storeTerms" as const },
  { href: "/admin/content/privacy", label: "storePrivacy" as const },
  { href: "/admin/content/refunds", label: "storeRefunds" as const },
];

export function ContentAdminNav() {
  const pathname = usePathname() ?? "";
  const { t } = useAdminI18n();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              active
                ? "bg-slate-900 text-white"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t(link.label)}
          </Link>
        );
      })}
    </nav>
  );
}
