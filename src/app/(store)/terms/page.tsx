import { HagourTermsPageClient } from "@/components/storefront/hagour-terms-page-client";
import { getStoreContact } from "@/lib/contact";
import { HAGOUR_DEFAULT_PHONE } from "@/lib/hagour-legal-contact";
import { buildHagourTermsHtml } from "@/lib/hagour-terms-default";
import { getStoreTermsContent } from "@/lib/store-pages";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const [page, settings] = await Promise.all([
    getStoreTermsContent(STORE_ID),
    prisma.storeSettings.findUnique({
      where: { storeId: STORE_ID },
      select: { storePhone: true, whatsappPhone: true },
    }),
  ]);

  const contact = getStoreContact({
    storePhone: settings?.storePhone?.trim() || HAGOUR_DEFAULT_PHONE,
    whatsappPhone: settings?.whatsappPhone?.trim() || undefined,
  });

  const contactHref = contact.whatsappHref || contact.telHref || "#";

  return (
    <HagourTermsPageClient
      fallback={{
        he: buildHagourTermsHtml("he"),
        ar: buildHagourTermsHtml("ar"),
        en: buildHagourTermsHtml("en"),
      }}
      htmlByLang={{
        he: page.contentHe,
        ar: page.contentAr,
        en: page.contentEn,
      }}
      storePhone={contact.storePhone}
      contactHref={contactHref}
    />
  );
}
