import { LegalDocumentClient } from "@/components/storefront/legal-document-client";
import { buildHagourPrivacyHtml } from "@/lib/hagour-privacy-default";
import { getStorePageContent } from "@/lib/store-pages";
import { STORE_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

const TITLES = {
  he: "מדיניות פרטיות",
  ar: "سياسة الخصوصية",
  en: "Privacy policy",
} as const;

export default async function PrivacyPage() {
  const page = await getStorePageContent(STORE_ID, "privacy");

  return (
    <LegalDocumentClient
      titles={TITLES}
      fallback={{
        he: buildHagourPrivacyHtml("he"),
        ar: buildHagourPrivacyHtml("ar"),
        en: buildHagourPrivacyHtml("en"),
      }}
      htmlByLang={{
        he: page.contentHe,
        ar: page.contentAr,
        en: page.contentEn,
      }}
    />
  );
}
