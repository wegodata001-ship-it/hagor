import { logSafeQueryError, logSafeQuerySlow, runtimeLog } from "@/lib/runtime-log/server";
import { getRequestPath } from "@/lib/server/request-path";

export type SafeQueryOptions = {
  /** Reject the inner promise after this many ms (returns fallback). */
  timeoutMs?: number;
  /** Log warn when duration exceeds this (default 8000). */
  slowThresholdMs?: number;
};

function raceWithTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`timeout:${name}:${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Runs an async DB (or IO) call; never throws — returns fallback on failure or timeout.
 * Logs structured errors with query name, duration, and request path.
 */
export async function safeQuery<T>(
  name: string,
  fn: () => Promise<T>,
  /** Default when the query fails or times out — does not affect inferred `T` (use `NoInfer`). */
  fallback: NoInfer<T>,
  opts?: SafeQueryOptions,
): Promise<T> {
  const started = Date.now();
  let path = "unknown";
  try {
    path = await getRequestPath();
  } catch {
    path = "unknown";
  }

  try {
    const p = opts?.timeoutMs ? raceWithTimeout(fn(), opts.timeoutMs, name) : fn();
    const result = await p;
    const durationMs = Date.now() - started;
    logSafeQuerySlow(name, durationMs, path, opts?.slowThresholdMs ?? 8000);
    if (process.env.NODE_ENV === "development" && durationMs > 2000) {
      runtimeLog({
        level: "debug",
        scope: "safe_query",
        message: "query_ok",
        query: name,
        durationMs,
        path,
      });
    }
    return result;
  } catch (err) {
    const durationMs = Date.now() - started;
    logSafeQueryError(name, err, durationMs, path);
    return fallback;
  }
}
