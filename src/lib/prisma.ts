import { prismaBase } from "@/lib/prisma-base";
import { isObservabilityDbEnabled } from "@/lib/observability/config";
import { recordPrismaQueryObservation } from "@/lib/observability/prisma-metrics";

/** Middleware preserves `PrismaClient` typing for `$transaction` and avoids recursive telemetry writes. */
prismaBase.$use(async (params, next) => {
  if (!isObservabilityDbEnabled()) {
    return next(params);
  }
  if (params.model === "ObservabilityEvent") {
    return next(params);
  }
  const t0 = Date.now();
  try {
    const result = await next(params);
    const durationMs = Date.now() - t0;
    void recordPrismaQueryObservation({
      model: params.model ?? "unknown",
      operation: params.action,
      durationMs,
      ok: true,
    });
    return result;
  } catch (err) {
    const durationMs = Date.now() - t0;
    void recordPrismaQueryObservation({
      model: params.model ?? "unknown",
      operation: params.action,
      durationMs,
      ok: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
});

export const prisma = prismaBase;
