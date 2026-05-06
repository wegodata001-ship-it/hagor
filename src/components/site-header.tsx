import { UserRole } from "@prisma/client";
import { getSiteName } from "@/lib/store-config";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";
import { StoreHeader } from "@/components/storefront/store-header";

export async function SiteHeader() {
  const title = getSiteName();
  const session = await getSession();
  const storeId = getStoreId();
  const categories = await prisma.category.findMany({
    where: { storeId, active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, parentId: true, name_he: true, name_ar: true, name_en: true },
  });
  const role = session?.role ?? null;
  const isLoggedIn = role === UserRole.CUSTOMER || role === UserRole.STORE_OWNER || role === UserRole.SUPER_ADMIN;

  return (
    <StoreHeader title={title} categories={categories} isLoggedIn={isLoggedIn} role={role} />
  );
}
