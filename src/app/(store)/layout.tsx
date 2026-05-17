import { CartProvider } from "@/components/cart-context";
import { SiteHeader } from "@/components/site-header";
import { StoreI18nProvider } from "@/components/storefront/store-i18n";
import { MobileBottomNav } from "@/components/storefront/mobile-bottom-nav";
import { SiteFooter } from "@/components/storefront/site-footer";

export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreI18nProvider>
      <CartProvider>
        <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white pb-20 md:pb-0">
          <SiteHeader />
          {children}
          <SiteFooter />
          <MobileBottomNav />
        </div>
      </CartProvider>
    </StoreI18nProvider>
  );
}
