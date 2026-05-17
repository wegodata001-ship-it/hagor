export const SESSION_COOKIE_NAME = "session";

/** Temporary auth/session diagnostics flag. Keep off in normal operation. */
export function isAuthDebugLogsEnabled(): boolean {
  return process.env.AUTH_DEBUG_LOGS === "true";
}
