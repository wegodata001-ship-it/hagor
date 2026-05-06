import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export async function logAdminAction(params: {
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.adminActionLog.create({
    data: {
      storeId: STORE_ID,
      userId: params.userId,
      action: params.action,
      entity: params.entity ?? null,
      entityId: params.entityId ?? null,
      metadata:
        params.metadata === undefined ? undefined : (params.metadata as Prisma.InputJsonValue),
    },
  });
}
