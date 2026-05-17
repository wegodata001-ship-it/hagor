import "server-only";

import { prismaBase } from "@/lib/prisma-base";
import { STORE_ID } from "@/lib/store";
import type { RuntimeLogPayload } from "@/lib/runtime-log-types";
import { getRequestPath, getTraceId } from "@/lib/server/request-path";
import { isObservabilityDbEnabled, observabilityRetentionDays } from "@/lib/observability/config";

const MAX_ERROR_LEN = 6000;
const PRUNE_ROLL = 60; // ~1.6% of ingest calls prune old rows

let observabilityStorageUnavailable = false;
let warnedStorageUnavailable = false;

function truncate(s: string | undefined, max: number): string | undefined {
  if (s == null) return undefined;
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/**
 * Server-only persistence for structured runtime logs.
 * Safe to call without awaiting; skips outside request context or when disabled.
 */
function shouldPersistPayload(payload: RuntimeLogPayload): boolean {
  if (payload.level === "error" || payload.level === "warn") return true;
  /* Sample auth timing for aggregation — avoids storing every info-level log */
  if (payload.scope === "api" && payload.message === "auth.me") return true;
  if (payload.scope === "api" && payload.message === "auth.me_failed") return true;
  return false;
}

function markObservabilityStorageUnavailable(err: unknown): void {
  observabilityStorageUnavailable = true;
  if (warnedStorageUnavailable) return;
  warnedStorageUnavailable = true;

  const message = err instanceof Error ? err.message : String(err);
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "warn",
      scope: "observability",
      message: "db_persistence_disabled",
      error: message,
    }),
  );
}

export function ingestRuntimeLogPayload(payload: RuntimeLogPayload): void {
  /* Never touch Prisma unless DB observability is explicitly enabled (see config). */
  if (!isObservabilityDbEnabled()) return;

  try {
    if (observabilityStorageUnavailable) return;
    if (!shouldPersistPayload(payload)) return;
  } catch {
    return;
  }

  void (async () => {
    try {
      let path = payload.path;
      let traceId: string | undefined;
      try {
        path = path ?? (await getRequestPath());
        traceId = (await getTraceId()) ?? undefined;
      } catch {
        path = path ?? "unknown";
      }

      await prismaBase.observabilityEvent.create({
        data: {
          storeId: STORE_ID,
          traceId,
          level: payload.level,
          scope: payload.scope,
          message: payload.message,
          queryKey: payload.query,
          path,
          durationMs: payload.durationMs,
          errorText: truncate(payload.error ?? payload.stack, MAX_ERROR_LEN),
          meta: {
            digest: payload.digest,
            stack: process.env.NODE_ENV === "development" ? truncate(payload.stack, 4000) : undefined,
          },
        },
      });

      if (Math.floor(Math.random() * PRUNE_ROLL) === 0) {
        const cutoff = new Date(Date.now() - observabilityRetentionDays() * 24 * 60 * 60 * 1000);
        await prismaBase.observabilityEvent.deleteMany({
          where: { storeId: STORE_ID, createdAt: { lt: cutoff } },
        });
      }
    } catch (err) {
      markObservabilityStorageUnavailable(err);
    }
  })();
}

export function ingestPrismaMetric(input: {
  model: string;
  operation: string;
  durationMs: number;
  ok: boolean;
  errorMessage?: string;
}): void {
  if (!isObservabilityDbEnabled()) return;

  try {
    if (observabilityStorageUnavailable) return;
  } catch {
    return;
  }

  void (async () => {
    try {
      let traceId: string | undefined;
      let path: string | undefined;
      try {
        traceId = (await getTraceId()) ?? undefined;
        path = await getRequestPath();
      } catch {
        path = undefined;
      }

      const level = input.ok ? "info" : "error";
      const message = input.ok ? "prisma_query" : "prisma_query_failed";

      await prismaBase.observabilityEvent.create({
        data: {
          storeId: STORE_ID,
          traceId,
          level,
          scope: "prisma",
          message,
          queryKey: `${input.model}.${input.operation}`,
          path,
          durationMs: input.durationMs,
          errorText: input.errorMessage ? truncate(input.errorMessage, MAX_ERROR_LEN) : undefined,
          meta: { model: input.model, operation: input.operation, ok: input.ok },
        },
      });
    } catch (err) {
      markObservabilityStorageUnavailable(err);
    }
  })();
}
