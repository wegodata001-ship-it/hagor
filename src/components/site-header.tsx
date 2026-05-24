import { UserRole } from "@prisma/client";
import { getStoreContact } from "@/lib/contact";
import { getSiteName, getStoreId } from "@/lib/store-config";
import { STORE_PHONE, WHATSAPP_PHONE } from "@/lib/store";
import { getCachedSession } from "@/lib/auth/cached-session";
import { prisma } from "@/lib/prisma";
import { StoreHeader } from "@/components/storefront/store-header";
import { safeQuery } from "@/lib/server/safe-query";
import { logServerComponentError } from "@/lib/runtime-log/server";
import { getRequestPath } from "@/lib/server/request-path";
import { filterHagourCategories, hagourCategoryIds } from "@/lib/hagour-catalog";

export async function SiteHeader() {
  const title = getSiteName();
  let session = null;
  try {
    session = await getCachedSession();
  } catch (e) {
    let path = "unknown";
    try {
      path = await getRequestPath();
    } catch {
      path = "unknown";
    }
    logServerComponentError("SiteHeader.session", e, path);
  }

  const storeId = getStoreId();
  const [categories, settings] = await Promise.all([
    safeQuery(
      "site_header.categories",
      () =>
        prisma.category.findMany({
          where: { storeId, active: true, id: { in: hagourCategoryIds(storeId) } },
          orderBy: { sortOrder: "asc" },
          select: { id: true, parentId: true, name_he: true, name_ar: true, name_en: true },
        }),
      [],
      { timeoutMs: 12_000 },
    ),
    safeQuery(
      "site_header.settings",
      () =>
        prisma.storeSettings.findUnique({
          where: { storeId },
          select: { storePhone: true, whatsappPhone: true },
        }),
      null,
      { timeoutMs: 8000 },
    ),
  ]);

  const contact = getStoreContact({
    storePhone: settings?.storePhone?.trim() || STORE_PHONE,
    whatsappPhone: settings?.whatsappPhone?.trim() || WHATSAPP_PHONE,
  });

  const role = session?.role ?? null;
  const isLoggedIn = role === UserRole.CUSTOMER || role === UserRole.STORE_OWNER || role === UserRole.SUPER_ADMIN;

  return (
    <StoreHeader
      title={title}
      categories={filterHagourCategories(categories)}
      isLoggedIn={isLoggedIn}
      role={role}
      storePhone={contact.storePhone}
      telHref={contact.telHref}
      whatsappHref={contact.whatsappHref}
    />
  );
}
