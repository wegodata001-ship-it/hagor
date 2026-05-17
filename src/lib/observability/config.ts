/**
 * Persist telemetry rows to Postgres. **Off by default** (console-only logging).
 * Enable only by setting BOTH:
 *   ENABLE_DB_OBSERVABILITY=true
 *   OBSERVABILITY_DB_ENABLED=true
 * Emergency kill switches (either disables DB writes):
 *   ENABLE_DB_OBSERVABILITY=false
 *   OBSERVABILITY_DB_ENABLED=false
 */
export function isObservabilityDbEnabled(): boolean {
  if (process.env.ENABLE_DB_OBSERVABILITY === "false") return false;
  if (process.env.OBSERVABILITY_DB_ENABLED === "false") return false;
  return (
    process.env.ENABLE_DB_OBSERVABILITY === "true" && process.env.OBSERVABILITY_DB_ENABLED === "true"
  );
}

/** Minimum Prisma query duration (ms) to record as a slow-query metric. */
export function prismaSlowThresholdMs(): number {
  const raw = process.env.OBSERVABILITY_PRISMA_SLOW_MS;
  const n = raw ? Number.parseInt(raw, 10) : 200;
  return Number.isFinite(n) && n >= 0 ? n : 200;
}

/** Drop observability rows older than this many days on dashboard load / ingest (best-effort). */
export function observabilityRetentionDays(): number {
  const raw = process.env.OBSERVABILITY_RETENTION_DAYS;
  const n = raw ? Number.parseInt(raw, 10) : 7;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 90) : 7;
}
