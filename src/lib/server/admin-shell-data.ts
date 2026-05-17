import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { safeQuery } from "@/lib/server/safe-query";

export type AdminShellData = {
  storeName: string;
  userName: string;
  logoPath: string | null;
};

export const getCachedAdminShellData = cache(async (userId: string): Promise<AdminShellData> => {
  const storeId = STORE_ID;
  const [user, store, settings] = await safeQuery(
    "admin.shell",
    () =>
      Promise.all([
        prisma.user.findFirst({ where: { id: userId, storeId }, select: { name: true } }),
        prisma.store.findUnique({ where: { id: storeId }, select: { name: true } }),
        prisma.storeSettings.findUnique({ where: { storeId }, select: { logoUrl: true } }),
      ]),
    [null, null, null] as [null, null, null],
    { timeoutMs: 15_000 },
  );

  return {
    storeName: store?.name ?? "Store",
    userName: user?.name ?? "Owner",
    logoPath: settings?.logoUrl ?? null,
  };
});
