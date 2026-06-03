import "server-only";

export type EmailLogType =
  | "contact_lead"
  | "contact_auto_reply"
  | "order_created"
  | "order_confirmation"
  | "order_paid"
  | "order_status"
  | "welcome"
  | "verify_email"
  | "password_reset"
  | "test"
  | "generic";

export function logEmailSuccess(type: EmailLogType, to: string) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[email] sent ${type} → ${to}`);
  }
}

export function logEmailFailure(type: EmailLogType, to: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[email] failed ${type} → ${to}:`, message);
}

export function logEmailSkipped(type: EmailLogType, reason: string) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[email] skipped ${type}: ${reason}`);
  }
}
