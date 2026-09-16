import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";

/**
 * "System status" is intentionally hidden from the admin sidebar — the store
 * owner shouldn't be looking at monitoring dashboards day-to-day. If someone
 * lands on `/admin/observability` directly, send them back to the dashboard.
 *
 * The observability BACKEND is preserved and unchanged:
 * - `/api/health`, monitoring aggregators, and every alert path still work.
 * - `src/lib/observability/aggregate.ts` and `system-status-stats.ts` are
 *   untouched — internal callers (cron jobs, health checks) rely on them.
 * - `src/components/admin/observability-admin-client.tsx` is preserved so
 *   a super-admin dashboard or CLI can re-mount it later without rework.
 */
export const dynamic = "force-dynamic";

export default async function AdminObservabilityRedirect() {
  await requireAdminSession();
  redirect("/admin");
}
