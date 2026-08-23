import { HagourLegalPageClient } from "@/components/storefront/hagour-legal-page-client";
import { loadPublishedOfficialLegal } from "@/lib/official-legal-page";
import type { OfficialLegalSlug } from "@/lib/store-pages";

export async function OfficialLegalRoute({ slug }: { slug: OfficialLegalSlug }) {
  const page = await loadPublishedOfficialLegal(slug);
  return <HagourLegalPageClient html={page.html} />;
}
