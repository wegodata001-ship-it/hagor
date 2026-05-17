import type { RuntimeLogPayload } from "@/lib/runtime-log-types";

export type { RuntimeLogLevel, RuntimeLogPayload } from "@/lib/runtime-log-types";

function serialize(payload: RuntimeLogPayload): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    runtime: "browser",
    path: payload.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    ...payload,
  });
}

/**
 * Browser-safe runtime logger.
 * Keep this module free of server imports, Prisma, DB utilities, and next/headers.
 */
export function runtimeLog(payload: RuntimeLogPayload): void {
  const line = serialize(payload);
  if (payload.level === "error") {
    console.error(line);
  } else if (payload.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }

  // Optional client telemetry can be added later via sendBeacon/fetch to a dedicated API route.
}

export function logClientError(scope: string, err: unknown, message = "client_error"): void {
  const e = err instanceof Error ? err : new Error(String(err));
  runtimeLog({
    level: "error",
    scope,
    message,
    error: e.message,
    stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
  });
}
