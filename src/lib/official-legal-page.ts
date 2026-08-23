import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getOfficialLegalPage,
  LEGAL_PUBLIC_PATH,
  officialLegalFallback,
  type OfficialLegalSlug,
} from "@/lib/store-pages";
import { getSiteUrl } from "@/lib/site-url";
import { STORE_ID } from "@/lib/store";
import { OFFICIAL_LEGAL_BY_SLUG } from "@/lib/hagour-official-legal";

export async function officialLegalMetadata(slug: OfficialLegalSlug): Promise<Metadata> {
  const doc = OFFICIAL_LEGAL_BY_SLUG[slug];
  const canonical = `${getSiteUrl()}${LEGAL_PUBLIC_PATH[slug]}`;
  return {
    title: doc.title,
    description: `${doc.title} — ${doc.company}, ${doc.hp}. ${doc.updated}`,
    alternates: { canonical },
    openGraph: {
      title: doc.title,
      url: canonical,
    },
  };
}

export async function loadPublishedOfficialLegal(slug: OfficialLegalSlug) {
  const page = await getOfficialLegalPage(STORE_ID, slug);
  const html = page.contentHe?.trim() || officialLegalFallback(slug).contentHe || "";
  if (!html) notFound();
  if (!page.isPublished) notFound();
  return {
    slug,
    title: page.title || OFFICIAL_LEGAL_BY_SLUG[slug].title,
    html,
    updatedAt: page.updatedAt,
  };
}
