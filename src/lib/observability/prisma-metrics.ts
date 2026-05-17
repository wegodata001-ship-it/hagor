import { ingestPrismaMetric } from "@/lib/observability/ingest.server";
import { isObservabilityDbEnabled, prismaSlowThresholdMs } from "@/lib/observability/config";

export function recordPrismaQueryObservation(input: {
  model: string;
  operation: string;
  durationMs: number;
  ok: boolean;
  errorMessage?: string;
}): void {
  if (!isObservabilityDbEnabled()) return;

  const threshold = prismaSlowThresholdMs();
  const slow = input.durationMs >= threshold;
  const failed = !input.ok;

  if (!slow && !failed) return;

  ingestPrismaMetric({
    model: input.model,
    operation: input.operation,
    durationMs: input.durationMs,
    ok: input.ok,
    errorMessage: input.errorMessage,
  });
}
