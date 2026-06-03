import { EmailSettingsClient } from "@/components/admin/email-settings-client";
import { requireAdminSession } from "@/lib/admin-auth";
import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminEmailSettingsPage() {
  const session = await requireAdminSession();
  const cfg = getEmailConfig();

  const user = await prisma.user.findFirst({
    where: { id: session.userId, storeId: STORE_ID },
    select: { email: true },
  });

  return (
    <EmailSettingsClient
      configured={isEmailConfigured()}
      adminEmail={user?.email ?? cfg.contactReceiver}
      smtpHost={cfg.host}
      fromName={cfg.fromName}
      fromAddress={cfg.fromAddress}
      contactReceiver={cfg.contactReceiver}
    />
  );
}
