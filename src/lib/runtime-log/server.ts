import "server-only";

import type { RuntimeLogPayload } from "@/lib/runtime-log-types";
import { ingestRuntimeLogPayload } from "@/lib/observability/ingest.server";

export type { RuntimeLogLevel, RuntimeLogPayload } from "@/lib/runtime-log-types";

function serialize(payload: RuntimeLogPayload): string {
  try {
    return JSON.stringify({
      ts: new Date().toISOString(),
      ...payload,
    });
  } catch {
    return JSON.stringify({
      ts: new Date().toISOString(),
      level: payload.level,
      scope: payload.scope,
      message: payload.message,
      error: "runtime_log_serialize_failed",
    });
  }
}

/**
 * Server-only structured runtime logger.
 * This module may ingest to DB and use request metadata, so it must never be imported by Client Components.
 */
export function runtimeLog(payload: RuntimeLogPayload): void {
  try {
    const line = serialize(payload);
    if (payload.level === "error") {
      console.error(line);
    } else if (payload.level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  } catch {
    // Logging must never interrupt rendering or request handling.
  }

  try {
    ingestRuntimeLogPayload(payload);
  } catch {
    // Observability persistence is best-effort only.
  }
}

export function logSafeQueryError(
  queryName: string,
  err: unknown,
  durationMs: number,
  path: string,
): void {
  const e = err instanceof Error ? err : new Error(String(err));
  const msg = e.message;
  const isTimeout = msg.includes("timeout:") || msg.startsWith("timeout:");
  runtimeLog({
    level: "error",
    scope: "safe_query",
    message: isTimeout ? "query_timeout" : "query_failed",
    query: queryName,
    durationMs,
    path,
    error: e.message,
    stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
  });
}

export function logSafeQuerySlow(queryName: string, durationMs: number, path: string, thresholdMs: number): void {
  if (durationMs < thresholdMs) return;
  runtimeLog({
    level: "warn",
    scope: "safe_query",
    message: "query_slow",
    query: queryName,
    durationMs,
    path,
  });
}

export function logServerComponentError(component: string, err: unknown, path: string): void {
  const e = err instanceof Error ? err : new Error(String(err));
  runtimeLog({
    level: "error",
    scope: "server_component",
    message: "render_failed",
    query: component,
    path,
    error: e.message,
    stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
  });
}
