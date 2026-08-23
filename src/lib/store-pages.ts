import { prisma } from "@/lib/prisma";
import {
  OFFICIAL_LEGAL_BY_SLUG,
  OFFICIAL_LEGAL_DOCS,
  type OfficialLegalSlug,
} from "@/lib/hagour-official-legal";
import { LEGAL_PUBLIC_PATH, isOfficialLegalSlug } from "@/lib/official-legal-meta";

export type { OfficialLegalSlug };
export { LEGAL_PUBLIC_PATH, isOfficialLegalSlug };

export type HagourContentSlug = OfficialLegalSlug;

export type StorePageContent = {
  slug: string;
  title: string;
  contentHe: string | null;
  contentEn: string | null;
  contentAr: string | null;
  isPublished: boolean;
  updatedAt: Date | null;
};

export function officialLegalFallback(slug: OfficialLegalSlug): StorePageContent {
  const doc = OFFICIAL_LEGAL_BY_SLUG[slug];
  return {
    slug: doc.slug,
    title: doc.title,
    contentHe: doc.html,
    contentEn: null,
    contentAr: null,
    isPublished: true,
    updatedAt: null,
  };
}

export async function getStorePage(storeId: string, slug: string): Promise<StorePageContent | null> {
  const page = await prisma.storePage.findUnique({
    where: { storeId_slug: { storeId, slug } },
    select: {
      slug: true,
      title: true,
      contentHe: true,
      contentEn: true,
      contentAr: true,
      isPublished: true,
      updatedAt: true,
    },
  });
  return page;
}

export async function getOfficialLegalPage(
  storeId: string,
  slug: OfficialLegalSlug,
): Promise<StorePageContent> {
  const page = await getStorePage(storeId, slug);
  if (page && (page.contentHe || page.contentEn || page.contentAr)) {
    return page;
  }
  return officialLegalFallback(slug);
}

/** @deprecated use getOfficialLegalPage */
export async function getStorePageContent(
  storeId: string,
  key: OfficialLegalSlug,
): Promise<StorePageContent> {
  return getOfficialLegalPage(storeId, key);
}

/** Terms: StorePage first, then official source. */
export async function getStoreTermsContent(storeId: string): Promise<StorePageContent> {
  return getOfficialLegalPage(storeId, "terms");
}

export function storePageHtmlForLang(page: StorePageContent): string | null {
  return page.contentHe || page.contentEn || page.contentAr;
}

export async function seedOfficialLegalPage(
  storeId: string,
  slug: OfficialLegalSlug,
  force = false,
): Promise<void> {
  const doc = OFFICIAL_LEGAL_BY_SLUG[slug];
  const existing = await prisma.storePage.findUnique({
    where: { storeId_slug: { storeId, slug } },
    select: { id: true },
  });
  if (existing && !force) return;

  await prisma.storePage.upsert({
    where: { storeId_slug: { storeId, slug } },
    create: {
      storeId,
      slug,
      title: doc.title,
      contentHe: doc.html,
      contentEn: null,
      contentAr: null,
      isPublished: true,
    },
    update: force
      ? {
          title: doc.title,
          contentHe: doc.html,
          contentEn: null,
          contentAr: null,
          isPublished: true,
        }
      : {},
  });
}

/** @deprecated use seedOfficialLegalPage */
export async function seedStorePage(
  storeId: string,
  key: OfficialLegalSlug,
  force = false,
): Promise<void> {
  await seedOfficialLegalPage(storeId, key, force);
}

export async function seedStoreTermsPage(storeId: string, force = false): Promise<void> {
  await seedOfficialLegalPage(storeId, "terms", force);
}

export async function seedAllHagourLegalPages(storeId: string, force = false): Promise<void> {
  for (const doc of OFFICIAL_LEGAL_DOCS) {
    await seedOfficialLegalPage(storeId, doc.slug, force);
  }
}
