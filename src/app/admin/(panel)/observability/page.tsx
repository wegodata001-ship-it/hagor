import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import type { ObservabilityDashboardData } from "@/lib/observability/aggregate";
import { loadObservabilityDashboard } from "@/lib/observability/aggregate";
import { ObservabilityAdminClient } from "@/components/admin/observability-admin-client";
import { safeQuery } from "@/lib/server/safe-query";

export const dynamic = "force-dynamic";

export default async function AdminObservabilityPage() {
  await requireAdminSession();
  const storeId = STORE_ID;

  const data = await safeQuery<ObservabilityDashboardData | null>(
    "admin.observability_dashboard",
    () => loadObservabilityDashboard(storeId),
    null,
    { timeoutMs: 30_000 },
  );

  return <ObservabilityAdminClient data={data} />;
}
