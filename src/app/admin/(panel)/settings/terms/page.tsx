import { TermsPoliciesAdminClient } from "@/components/admin/terms-policies-admin-client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminTermsPoliciesPage() {
  await requireAdminSession();
  const storeId = STORE_ID;

  let settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  if (!settings) {
    settings = await prisma.storeSettings.create({
      data: { storeId },
    });
  }

  const published = {
    terms_he: settings.terms_he,
    terms_en: settings.terms_en,
    terms_ar: settings.terms_ar,
    privacy_he: settings.privacy_he,
    privacy_en: settings.privacy_en,
    privacy_ar: settings.privacy_ar,
    refund_he: settings.refund_he,
    refund_en: settings.refund_en,
    refund_ar: settings.refund_ar,
    shipping_he: settings.shipping_he,
    shipping_en: settings.shipping_en,
    shipping_ar: settings.shipping_ar,
    termsPublishedAt: settings.termsPublishedAt?.toISOString() ?? null,
    privacyPublishedAt: settings.privacyPublishedAt?.toISOString() ?? null,
    refundPublishedAt: settings.refundPublishedAt?.toISOString() ?? null,
    shippingPublishedAt: settings.shippingPublishedAt?.toISOString() ?? null,
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-white/10 bg-[#0a0f1a] p-6 text-slate-100 shadow-xl">
      <TermsPoliciesAdminClient published={published} policyDraftsRaw={settings.policyDrafts} />
    </div>
  );
}
