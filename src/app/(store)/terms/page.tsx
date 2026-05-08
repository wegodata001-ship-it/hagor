import { LegalDocumentClient } from "@/components/storefront/legal-document-client";
import { LEGAL_FALLBACK } from "@/lib/legal-defaults";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

const TITLES = {
  he: "תקנון השימוש",
  ar: "شروط الاستخدام",
  en: "Terms of use",
} as const;

export default async function TermsPage() {
  const storeId = STORE_ID;
  const s = await prisma.storeSettings.findUnique({
    where: { storeId },
    select: { terms_he: true, terms_ar: true, terms_en: true },
  });

  return (
    <LegalDocumentClient
      titles={TITLES}
      fallback={LEGAL_FALLBACK.terms}
      htmlByLang={{
        he: s?.terms_he ?? null,
        ar: s?.terms_ar ?? null,
        en: s?.terms_en ?? null,
      }}
    />
  );
}
