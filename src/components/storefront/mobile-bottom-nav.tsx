"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-context";
import { useStoreI18n } from "@/components/storefront/store-i18n";

function NavItem({
  href,
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
        active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      <span
        className={`text-lg leading-none ${active ? "drop-shadow-[0_0_14px_rgba(249,115,22,0.25)]" : ""}`}
        aria-hidden
      >
        {icon}
      </span>
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="absolute right-[26%] top-1 rounded-full bg-hagor-gold px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { items } = useCart();
  const { t } = useStoreI18n();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-7xl">
        <NavItem href="/" label="Home" icon="⌂" active={pathname === "/"} />
        <NavItem href="/products" label="Search" icon="⌕" active={pathname === "/products"} />
        <NavItem href="/cart" label={t("cart")} icon="🛒" active={pathname === "/cart"} badge={count} />
        <NavItem href="/account" label={t("myAccount")} icon="👤" active={pathname.startsWith("/account")} />
        <NavItem
          href="#"
          label="Menu"
          icon="☰"
          active={false}
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new Event("hagor:open-mobile-menu"));
          }}
        />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

