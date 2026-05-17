import type { StoreSettings } from "@prisma/client";
import { TermsPoliciesAdminClient } from "@/components/admin/terms-policies-admin-client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminTermsPoliciesPage() {
  await requireAdminSession();
  const storeId = STORE_ID;

  const payload = await safeQuery<StoreSettings | null>(
    "admin.terms",
    async (): Promise<StoreSettings> => {
      let settings = await prisma.storeSettings.findUnique({ where: { storeId } });
      if (!settings) {
        settings = await prisma.storeSettings.create({
          data: { storeId },
        });
      }
      return settings;
    },
    null,
    { timeoutMs: 25_000 },
  );

  if (!payload) {
    return (
      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <p className="font-medium">Unable to load terms and policies.</p>
        <p className="mt-2 text-sm">Please refresh or try again shortly.</p>
      </div>
    );
  }

  const settings = payload;

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
