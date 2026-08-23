import { notFound } from "next/navigation";
import { LegalDocumentEditorClient } from "@/components/admin/legal-document-editor-client";
import { OFFICIAL_LEGAL_BY_SLUG } from "@/lib/hagour-official-legal";
import { getOfficialLegalPage, isOfficialLegalSlug } from "@/lib/store-pages";
import { getStoreId } from "@/lib/store-config";

export const dynamic = "force-dynamic";

export default async function AdminLegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isOfficialLegalSlug(slug)) notFound();

  const storeId = getStoreId();
  const page = await getOfficialLegalPage(storeId, slug);
  const fallback = OFFICIAL_LEGAL_BY_SLUG[slug];

  return (
    <LegalDocumentEditorClient
      initial={{
        slug,
        title: page.title || fallback.title,
        contentHe: page.contentHe || fallback.html,
        isPublished: page.isPublished,
        updatedAt: page.updatedAt?.toISOString() ?? null,
      }}
    />
  );
}
