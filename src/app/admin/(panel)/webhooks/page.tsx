import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import type { WebhookLogDTO } from "@/components/admin/webhooks-admin-client";
import { WebhooksAdminClient } from "@/components/admin/webhooks-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminWebhooksPage() {
  await requireAdminSession();
  const storeId = STORE_ID;
  const logs = await prisma.paymentWebhookLog.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const dtos: WebhookLogDTO[] = logs.map((w) => ({
    id: w.id,
    provider: w.provider,
    status: w.status,
    createdAt: w.createdAt.toISOString(),
    rawPayload: w.rawPayload ?? {},
  }));

  return <WebhooksAdminClient logs={dtos} />;
}
