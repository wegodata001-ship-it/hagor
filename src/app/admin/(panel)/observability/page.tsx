import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import type { ObservabilityDashboardData } from "@/lib/observability/aggregate";
import { loadObservabilityDashboard } from "@/lib/observability/aggregate";
import { ObservabilityAdminClient } from "@/components/admin/observability-admin-client";
import { isEmailConfigured } from "@/lib/email/config";
import { safeQuery } from "@/lib/server/safe-query";
import {
  loadSystemStatusBusinessStats,
  type SystemStatusBusinessStats,
} from "@/lib/system-status-stats";

export const dynamic = "force-dynamic";

export default async function AdminObservabilityPage() {
  await requireAdminSession();
  const storeId = STORE_ID;

  const [data, business] = await Promise.all([
    safeQuery<ObservabilityDashboardData | null>(
      "admin.observability_dashboard",
      () => loadObservabilityDashboard(storeId),
      null,
      { timeoutMs: 30_000 },
    ),
    safeQuery<SystemStatusBusinessStats | null>(
      "admin.system_status_business",
      () => loadSystemStatusBusinessStats(storeId),
      null,
      { timeoutMs: 15_000 },
    ),
  ]);

  return (
    <ObservabilityAdminClient
      data={data}
      business={business}
      emailConfigured={isEmailConfigured()}
      checkedAt={business?.checkedAt ?? new Date().toISOString()}
    />
  );
}
