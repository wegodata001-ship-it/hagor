import { LegalDocumentClient } from "@/components/storefront/legal-document-client";
import { LEGAL_FALLBACK } from "@/lib/legal-defaults";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

const TITLES = {
  he: "מדיניות משלוחים",
  ar: "سياسة الشحن",
  en: "Shipping policy",
} as const;

export default async function ShippingPolicyPage() {
  const storeId = STORE_ID;
  const s = await prisma.storeSettings.findUnique({
    where: { storeId },
    select: { shipping_he: true, shipping_ar: true, shipping_en: true },
  });

  return (
    <LegalDocumentClient
      titles={TITLES}
      fallback={LEGAL_FALLBACK.shipping}
      htmlByLang={{
        he: s?.shipping_he ?? null,
        ar: s?.shipping_ar ?? null,
        en: s?.shipping_en ?? null,
      }}
    />
  );
}
