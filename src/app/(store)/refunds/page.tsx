import { LegalDocumentClient } from "@/components/storefront/legal-document-client";
import { buildHagourRefundsHtml } from "@/lib/hagour-refunds-default";
import { getStorePageContent } from "@/lib/store-pages";
import { STORE_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

const TITLES = {
  he: "ביטולים והחזרים",
  ar: "الإلغاء والاسترداد",
  en: "Cancellations & refunds",
} as const;

export default async function RefundsPage() {
  const page = await getStorePageContent(STORE_ID, "refunds");

  return (
    <LegalDocumentClient
      titles={TITLES}
      fallback={{
        he: buildHagourRefundsHtml("he"),
        ar: buildHagourRefundsHtml("ar"),
        en: buildHagourRefundsHtml("en"),
      }}
      htmlByLang={{
        he: page.contentHe,
        ar: page.contentAr,
        en: page.contentEn,
      }}
    />
  );
}
