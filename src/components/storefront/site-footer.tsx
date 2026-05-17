import { prisma } from "@/lib/prisma";
import { getStoreContact } from "@/lib/contact";
import { getStoreId } from "@/lib/store-config";
import { STORE_PHONE, WHATSAPP_PHONE } from "@/lib/store";
import { StoreFooter } from "@/components/storefront/store-footer";
import { safeQuery } from "@/lib/server/safe-query";

export async function SiteFooter() {
  const storeId = getStoreId();
  const settings = await safeQuery(
    "site_footer.settings",
    () =>
      prisma.storeSettings.findUnique({
        where: { storeId },
        select: { storePhone: true, whatsappPhone: true, supportEmail: true },
      }),
    null,
    { timeoutMs: 8000 },
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
      supportEmail={settings?.supportEmail ?? null}
    />
  );
}
