import { LegalDocumentsHubClient } from "@/components/admin/legal-documents-hub-client";
import { OFFICIAL_LEGAL_DOCS } from "@/lib/hagour-official-legal";
import { getStoreId } from "@/lib/store-config";
import { getOfficialLegalPage } from "@/lib/store-pages";

export const dynamic = "force-dynamic";

export default async function AdminLegalDocumentsPage() {
  const storeId = getStoreId();
  const cards = await Promise.all(
    OFFICIAL_LEGAL_DOCS.map(async (doc) => {
      const page = await getOfficialLegalPage(storeId, doc.slug);
      return {
        slug: doc.slug,
        title: page.title || doc.title,
        updatedAt: page.updatedAt?.toISOString() ?? null,
        isPublished: page.isPublished,
      };
    }),
  );

  return <LegalDocumentsHubClient cards={cards} />;
}
