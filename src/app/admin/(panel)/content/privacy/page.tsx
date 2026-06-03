import { StoreContentPageAdminClient } from "@/components/admin/store-content-page-admin-client";
import { defaultHagourPrivacyContent, HAGOUR_PRIVACY_SLUG } from "@/lib/hagour-privacy-default";
import { getStorePage } from "@/lib/store-pages";
import { getStoreId } from "@/lib/store-config";

export const dynamic = "force-dynamic";

export default async function AdminStorePrivacyPage() {
  const storeId = getStoreId();
  const page = await getStorePage(storeId, HAGOUR_PRIVACY_SLUG);
  const defaults = defaultHagourPrivacyContent();

  return (
    <StoreContentPageAdminClient
      initial={{
        slug: "privacy",
        title: page?.title ?? defaults.title,
        contentHe: page?.contentHe ?? defaults.contentHe,
        contentEn: page?.contentEn ?? defaults.contentEn,
        contentAr: page?.contentAr ?? defaults.contentAr,
        updatedAt: page?.updatedAt?.toISOString() ?? null,
      }}
    />
  );
}
