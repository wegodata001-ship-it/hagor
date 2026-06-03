import { StoreContentPageAdminClient } from "@/components/admin/store-content-page-admin-client";
import { defaultHagourRefundsContent, HAGOUR_REFUNDS_SLUG } from "@/lib/hagour-refunds-default";
import { getStorePage } from "@/lib/store-pages";
import { getStoreId } from "@/lib/store-config";

export const dynamic = "force-dynamic";

export default async function AdminStoreRefundsPage() {
  const storeId = getStoreId();
  const page = await getStorePage(storeId, HAGOUR_REFUNDS_SLUG);
  const defaults = defaultHagourRefundsContent();

  return (
    <StoreContentPageAdminClient
      initial={{
        slug: "refunds",
        title: page?.title ?? defaults.title,
        contentHe: page?.contentHe ?? defaults.contentHe,
        contentEn: page?.contentEn ?? defaults.contentEn,
        contentAr: page?.contentAr ?? defaults.contentAr,
        updatedAt: page?.updatedAt?.toISOString() ?? null,
      }}
    />
  );
}
