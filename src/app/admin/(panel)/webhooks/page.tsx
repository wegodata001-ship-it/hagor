import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { WebhooksAdminClient } from "@/components/admin/webhooks-admin-client";
import type { EnrichedWebhookEvent } from "@/lib/payments/webhook-events";
import { loadRecentWebhookEvents } from "@/lib/payments/webhook-events";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminWebhooksPage() {
  await requireAdminSession();
  const events: EnrichedWebhookEvent[] = await safeQuery(
    "admin.webhooks",
    () => loadRecentWebhookEvents({ storeId: STORE_ID, take: 200 }),
    [],
    { timeoutMs: 25_000 },
  );
  return <WebhooksAdminClient events={events} />;
}
