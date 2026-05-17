import { headers } from "next/headers";

/**
 * Best-effort pathname for the current request (set in middleware).
 */
export async function getRequestPath(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-request-path") ??
      h.get("next-url") ??
      h.get("referer")?.replace(/^https?:\/\/[^/]+/, "") ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

/** Correlation id for request tracing (set in middleware). */
export async function getTraceId(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-trace-id");
  } catch {
    return null;
  }
}
