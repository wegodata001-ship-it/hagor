import { StoreContentPageAdminClient } from "@/components/admin/store-content-page-admin-client";
import { defaultHagourTermsContent, HAGOUR_TERMS_SLUG } from "@/lib/hagour-terms-default";
import { getStorePage } from "@/lib/store-pages";
import { getStoreId } from "@/lib/store-config";

export const dynamic = "force-dynamic";

export default async function AdminStoreTermsPage() {
  const storeId = getStoreId();
  const page = await getStorePage(storeId, HAGOUR_TERMS_SLUG);
  const defaults = defaultHagourTermsContent();

  return (
    <StoreContentPageAdminClient
      initial={{
        slug: "terms",
        title: page?.title ?? defaults.title,
        contentHe: page?.contentHe ?? defaults.contentHe,
        contentEn: page?.contentEn ?? defaults.contentEn,
        contentAr: page?.contentAr ?? defaults.contentAr,
        updatedAt: page?.updatedAt?.toISOString() ?? null,
      }}
    />
  );
}
