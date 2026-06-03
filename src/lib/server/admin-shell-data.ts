import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { safeQuery } from "@/lib/server/safe-query";
import { getCachedStoreContactSettings } from "@/lib/server/storefront-layout-data";

export type AdminShellData = {
  storeName: string;
  userName: string;
  logoPath: string | null;
};

export const getCachedAdminShellData = cache(async (userId: string): Promise<AdminShellData> => {
  const storeId = STORE_ID;
  const [user, store, settings] = await safeQuery(
    "admin.shell",
    async () => {
      const userRow = await prisma.user.findFirst({
        where: { id: userId, storeId },
        select: { name: true },
      });
      const storeRow = await prisma.store.findUnique({
        where: { id: storeId },
        select: { name: true },
      });
      const settingsRow = await getCachedStoreContactSettings(storeId);
      return [userRow, storeRow, settingsRow] as const;
    },
    [null, null, null] as [null, null, null],
    { timeoutMs: 15_000 },
  );

  return {
    storeName: store?.name ?? "Store",
    userName: user?.name ?? "Owner",
    logoPath: settings?.logoUrl ?? null,
  };
});
