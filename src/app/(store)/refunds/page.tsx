import { LegalDocumentClient } from "@/components/storefront/legal-document-client";
import { LEGAL_FALLBACK } from "@/lib/legal-defaults";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

const TITLES = {
  he: "ביטולים והחזרים",
  ar: "الإلغاء والاسترداد",
  en: "Cancellations & refunds",
} as const;

export default async function RefundsPage() {
  const storeId = STORE_ID;
  const s = await prisma.storeSettings.findUnique({
    where: { storeId },
    select: { refund_he: true, refund_ar: true, refund_en: true },
  });

  return (
    <LegalDocumentClient
      titles={TITLES}
      fallback={LEGAL_FALLBACK.refund}
      htmlByLang={{
        he: s?.refund_he ?? null,
        ar: s?.refund_ar ?? null,
        en: s?.refund_en ?? null,
      }}
    />
  );
}
