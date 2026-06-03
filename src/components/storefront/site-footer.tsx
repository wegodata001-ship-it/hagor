import { getStoreContact } from "@/lib/contact";
import { getHagourSupportEmail } from "@/lib/hagour-contact";
import { getStoreId } from "@/lib/store-config";
import { STORE_PHONE, WHATSAPP_PHONE } from "@/lib/store";
import { StoreFooter } from "@/components/storefront/store-footer";
import { safeQuery } from "@/lib/server/safe-query";
import {
  getCachedNavCategories,
  getCachedStoreContactSettings,
} from "@/lib/server/storefront-layout-data";

export async function SiteFooter() {
  const storeId = getStoreId();
  const settings = await safeQuery(
    "site_footer.settings",
    () => getCachedStoreContactSettings(storeId),
    null,
    { timeoutMs: 12_000 },
  );
  const categories = await safeQuery(
    "site_footer.categories",
    () => getCachedNavCategories(storeId),
    [],
    { timeoutMs: 12_000 },
  );

  const contact = getStoreContact({
    storePhone: settings?.storePhone?.trim() || STORE_PHONE,
    whatsappPhone: settings?.whatsappPhone?.trim() || WHATSAPP_PHONE,
  });

  return (
    <StoreFooter
      storePhone={contact.storePhone}
      telHref={contact.telHref}
      whatsappHref={contact.whatsappHref}
      supportEmail={settings?.supportEmail?.trim() || getHagourSupportEmail()}
      categories={categories}
    />
  );
}
