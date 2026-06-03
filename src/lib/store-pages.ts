import type { Locale } from "@/lib/localized";
import { prisma } from "@/lib/prisma";
import {
  applyHagourLegalContactTokens,
  resolveHagourLegalContact,
} from "@/lib/hagour-legal-contact";
import {
  defaultHagourPrivacyContent,
  HAGOUR_PRIVACY_SLUG,
  HAGOUR_PRIVACY_TITLE,
} from "@/lib/hagour-privacy-default";
import {
  defaultHagourRefundsContent,
  HAGOUR_REFUNDS_SLUG,
  HAGOUR_REFUNDS_TITLE,
} from "@/lib/hagour-refunds-default";
import {
  defaultHagourTermsContent,
  HAGOUR_TERMS_SLUG,
  HAGOUR_TERMS_TITLE,
} from "@/lib/hagour-terms-default";

export type StorePageContent = {
  slug: string;
  title: string;
  contentHe: string | null;
  contentEn: string | null;
  contentAr: string | null;
  updatedAt: Date | null;
};

export type HagourContentSlug = "terms" | "privacy" | "refunds";

const PAGE_DEFAULTS: Record<
  HagourContentSlug,
  { slug: string; title: string; content: () => ReturnType<typeof defaultHagourTermsContent> }
> = {
  terms: { slug: HAGOUR_TERMS_SLUG, title: HAGOUR_TERMS_TITLE, content: defaultHagourTermsContent },
  privacy: { slug: HAGOUR_PRIVACY_SLUG, title: HAGOUR_PRIVACY_TITLE, content: defaultHagourPrivacyContent },
  refunds: { slug: HAGOUR_REFUNDS_SLUG, title: HAGOUR_REFUNDS_TITLE, content: defaultHagourRefundsContent },
};

async function loadLegalContact(storeId: string) {
  const settings = await prisma.storeSettings.findUnique({
    where: { storeId },
    select: { storePhone: true, supportEmail: true },
  });
  return resolveHagourLegalContact(settings ?? undefined);
}

function enrichPageContent(page: StorePageContent, contact: ReturnType<typeof resolveHagourLegalContact>): StorePageContent {
  const enrich = (html: string | null, locale: Locale) =>
    html ? applyHagourLegalContactTokens(html, contact, locale) : null;

  return {
    ...page,
    contentHe: enrich(page.contentHe, "he"),
    contentEn: enrich(page.contentEn, "en"),
    contentAr: enrich(page.contentAr, "ar"),
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
      updatedAt: true,
    },
  });
  return page;
}

export async function getStorePageContent(
  storeId: string,
  key: HagourContentSlug,
): Promise<StorePageContent> {
  const meta = PAGE_DEFAULTS[key];
  const page = await getStorePage(storeId, meta.slug);
  const contact = await loadLegalContact(storeId);

  if (page && (page.contentHe || page.contentEn || page.contentAr)) {
    return enrichPageContent(page, contact);
  }

  const defaults = meta.content();
  const fallback: StorePageContent = {
    slug: meta.slug,
    title: defaults.title,
    contentHe: defaults.contentHe,
    contentEn: defaults.contentEn,
    contentAr: defaults.contentAr,
    updatedAt: null,
  };
  return enrichPageContent(fallback, contact);
}

/** Terms: StorePage first, then legacy StoreSettings columns. */
export async function getStoreTermsContent(storeId: string): Promise<StorePageContent> {
  return getStorePageContent(storeId, "terms");
}

export function storePageHtmlForLang(page: StorePageContent, lang: Locale): string | null {
  if (lang === "he") return page.contentHe;
  if (lang === "ar") return page.contentAr;
  return page.contentEn;
}

export async function seedStorePage(
  storeId: string,
  key: HagourContentSlug,
  force = false,
): Promise<void> {
  const meta = PAGE_DEFAULTS[key];
  const existing = await prisma.storePage.findUnique({
    where: { storeId_slug: { storeId, slug: meta.slug } },
    select: { id: true },
  });
  if (existing && !force) return;

  const content = meta.content();
  await prisma.storePage.upsert({
    where: { storeId_slug: { storeId, slug: meta.slug } },
    create: {
      storeId,
      slug: meta.slug,
      title: content.title,
      contentHe: content.contentHe,
      contentEn: content.contentEn,
      contentAr: content.contentAr,
    },
    update: force
      ? {
          title: content.title,
          contentHe: content.contentHe,
          contentEn: content.contentEn,
          contentAr: content.contentAr,
        }
      : {},
  });
}

export async function seedStoreTermsPage(storeId: string, force = false): Promise<void> {
  await seedStorePage(storeId, "terms", force);
}

export async function seedAllHagourLegalPages(storeId: string, force = false): Promise<void> {
  await seedStorePage(storeId, "terms", force);
  await seedStorePage(storeId, "privacy", force);
  await seedStorePage(storeId, "refunds", force);
}
