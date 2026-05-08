"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { resolvePublicAssetSrc } from "@/lib/assets-path";
import { AdminI18nProvider, isRtl, useAdminI18n } from "@/lib/admin-i18n";

const NAV: { href: string; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { href: "/admin", label: "dashboard", Icon: IconDashboard },
  { href: "/admin/products", label: "products", Icon: IconBox },
  { href: "/admin/categories", label: "categories", Icon: IconGrid },
  { href: "/admin/banners", label: "banners", Icon: IconImage },
  { href: "/admin/orders", label: "orders", Icon: IconCart },
  { href: "/admin/customers", label: "customer", Icon: IconUsers },
  { href: "/admin/delivery", label: "delivery", Icon: IconTruck },
  { href: "/admin/coupons", label: "coupons", Icon: IconTag },
  { href: "/admin/loyalty", label: "loyalty", Icon: IconStar },
  { href: "/admin/settings", label: "storeSettings", Icon: IconGear },
  { href: "/admin/settings/terms", label: "termsPolicies", Icon: IconDocument },
  { href: "/admin/webhooks", label: "paymentWebhooks", Icon: IconWebhook },
];

function navActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/settings") {
    return pathname === "/admin/settings";
  }
  if (href === "/admin/settings/terms") {
    return pathname.startsWith("/admin/settings/terms");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminAppShell({
  storeName,
  userName,
  logoPath,
  children,
}: {
  storeName: string;
  userName: string;
  logoPath: string | null;
  children: React.ReactNode;
}) {
  return (
    <AdminI18nProvider>
      <AdminAppShellInner storeName={storeName} userName={userName} logoPath={logoPath}>
        {children}
      </AdminAppShellInner>
    </AdminI18nProvider>
  );
}

function AdminAppShellInner({
  storeName,
  userName,
  logoPath,
  children,
}: {
  storeName: string;
  userName: string;
  logoPath: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { lang, setLang, t } = useAdminI18n();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login-admin");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  const logoSrc = logoPath ? resolvePublicAssetSrc(logoPath) : undefined;
  const rtl = isRtl(lang);

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={lang} className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      {/* Fixed sidebar */}
      <aside
        className={`fixed inset-y-0 z-50 flex w-[240px] flex-col bg-[#0a0f1a] text-slate-100 shadow-xl ${
          rtl ? "right-0" : "left-0"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-4">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
              {storeName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="truncate text-sm font-semibold tracking-tight">{storeName}</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV.map(({ href, label, Icon }) => {
            const active = navActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/15 text-white shadow-inner ring-1 ring-white/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" />
                <span>{t(label as never)}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="border-t border-white/10 px-4 py-3 text-xs text-slate-500 hover:text-white"
        >
          {rtl ? `← ${t("backToSite")}` : `${t("backToSite")} →`}
        </Link>
      </aside>

      {/* Main column */}
      <div className={`${rtl ? "mr-[240px]" : "ml-[240px]"} flex min-h-screen flex-col`}>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{storeName}</div>
            <div className="truncate text-xs text-slate-500">{t("adminPanel")}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-md border border-slate-200 text-xs font-medium text-slate-700">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-1 hover:bg-slate-50 ${lang === "en" ? "bg-slate-100" : ""}`}
              >
                {t("english")}
              </button>
              <button
                type="button"
                onClick={() => setLang("he")}
                className={`px-2 py-1 hover:bg-slate-50 ${lang === "he" ? "bg-slate-100" : ""}`}
              >
                {t("hebrew")}
              </button>
              <button
                type="button"
                onClick={() => setLang("ar")}
                className={`px-2 py-1 hover:bg-slate-50 ${lang === "ar" ? "bg-slate-100" : ""}`}
              >
                {t("arabic")}
              </button>
            </div>
            <span className="hidden text-sm text-slate-700 sm:inline">{userName}</span>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loggingOut && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {t("logout")}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H15.75A2.25 2.25 0 0113.5 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75h2.25a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25H15.75A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  );
}
function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V18a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V7.5m18 0A2.25 2.25 0 0019.5 5.25h-15a2.25 2.25 0 00-2.25 2.25m18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V7.5" />
    </svg>
  );
}
function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM3.75 15.75A2.25 2.25 0 016 13.5h2.25A2.25 2.25 0 0110.5 15.75V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25z" />
    </svg>
  );
}
function IconImage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-10.21l.867-.867A2.25 2.25 0 0118 5.25v12.75a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18V9a2.25 2.25 0 011.166-1.973l.867-.867" />
    </svg>
  );
}
function IconCart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.591 1.872-5.42 1.872-8.25V6.75A2.25 2.25 0 0018 4.5H6.75a2.25 2.25 0 00-2.25 2.25v5.25c0 .966.784 1.75 1.75 1.75z" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.003 9.003 0 00-6 0M12 12a3 3 0 100-6 3 3 0 000 6zm7.5 8.128a8.97 8.97 0 00-3.216-5.637M4.716 14.49A8.97 8.97 0 013.5 20.128"
      />
    </svg>
  );
}
function IconTruck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h3.75m0 0V6.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v6.75m-12 0h12" />
    </svg>
  );
}
function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .858.334 1.683.93 2.292l7.362 7.362a2.25 2.25 0 003.182 0l6.364-6.364a2.25 2.25 0 000-3.182L13.09 2.93c-.617-.616-1.43-.93-2.292-.93z" />
    </svg>
  );
}
function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.322-1.088l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}
function IconGear({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.274.152.577.225.884.225h1.89l.621-.621a1.125 1.125 0 011.587 0l1.586 1.586a1.125 1.125 0 010 1.587l-.621.621v1.89c0 .307-.073.61-.225.884-.184.332-.496.582-.87.645l-1.281.213c-.54.09-.94.56-.94 1.11v2.593c0 .55-.398 1.02-.94 1.11l-1.281.213c-.374.063-.686.313-.87.645-.152.274-.225.577-.225.884v1.89l-.621.621a1.125 1.125 0 01-1.587 0l-1.586-1.586a1.125 1.125 0 00-1.587 0l-.621.621H9.75c-.307 0-.61-.073-.884-.225a1.125 1.125 0 00-.645-.87l-.213-1.281c-.09-.54-.56-.94-1.11-.94H5.25l-.621.621a1.125 1.125 0 01-1.587 0L1.456 17.06a1.125 1.125 0 010-1.587l.621-.621V12.96c0-.307-.073-.61-.225-.884a1.125 1.125 0 00-.645-.87l-1.281-.213c-.54-.09-.94-.56-.94-1.11V7.203c0-.55.398-1.02.94-1.11l1.281-.213c.374-.063.686-.313.87-.645.152-.274.225-.577.225-.884V3.456l.621-.621a1.125 1.125 0 011.587 0l1.586 1.586a1.125 1.125 0 001.587 0l.621-.621z" />
    </svg>
  );
}
function IconDocument({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v7.5m2.25-7.5v7.5m3-18v11.25a3 3 0 003 3h6.018a3 3 0 001.984-5.313l-8.49-8.49a3 3 0 00-4.242 0L5.31 15.984A3 3 0 004.5 18v2.25"
      />
    </svg>
  );
}
function IconWebhook({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.232" />
    </svg>
  );
}
