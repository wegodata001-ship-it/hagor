import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { SettingsAdminClient } from "@/components/admin/settings-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminSession();
  const storeId = STORE_ID;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    return <p className="text-slate-600">Store not found.</p>;
  }

  let settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  if (!settings) {
    settings = await prisma.storeSettings.create({
      data: { storeId },
    });
  }

  return (
    <SettingsAdminClient
      storeName={store.name}
      settings={{
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        accentColor: settings.accentColor,
        secondaryColor: settings.secondaryColor,
        whatsappPhone: settings.whatsappPhone,
        supportEmail: settings.supportEmail,
        languageDefault: settings.languageDefault,
        orderNumberPrefix: settings.orderNumberPrefix,
        currency: settings.currency,
        rtlEnabled: settings.rtlEnabled,
        registrationEnabled: settings.registrationEnabled,
        requireEmailVerificationForCheckout: settings.requireEmailVerificationForCheckout,
      }}
      hero={{
        heroTitle_he: settings.heroTitle_he,
        heroTitle_ar: settings.heroTitle_ar,
        heroTitle_en: settings.heroTitle_en,
        heroSubtitle_he: settings.heroSubtitle_he,
        heroSubtitle_ar: settings.heroSubtitle_ar,
        heroSubtitle_en: settings.heroSubtitle_en,
      }}
    />
  );
}
