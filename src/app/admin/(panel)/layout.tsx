import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminAppShell } from "@/components/admin/admin-app-shell";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  const storeId = STORE_ID;

  const [user, store, settings] = await Promise.all([
    prisma.user.findFirst({ where: { id: session.userId, storeId } }),
    prisma.store.findUnique({ where: { id: storeId } }),
    prisma.storeSettings.findUnique({ where: { storeId } }),
  ]);

  return (
    <AdminAppShell
      storeName={store?.name ?? "Store"}
      userName={user?.name ?? "Owner"}
      logoPath={settings?.logoUrl ?? null}
    >
      {children}
    </AdminAppShell>
  );
}
