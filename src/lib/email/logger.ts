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

function redactRecipient(to: string): string {
  const at = to.indexOf("@");
  if (at <= 1) return "***";
  return `${to.slice(0, 1)}***${to.slice(at)}`;
}

export function logEmailSuccess(type: EmailLogType, to: string) {
  console.info(`[email] sent type=${type} to=${redactRecipient(to)}`);
}

export function logEmailFailure(type: EmailLogType, to: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[email] EMAIL_FAILED type=${type} to=${redactRecipient(to)}:`, message.slice(0, 400));
}

export function logEmailSkipped(type: EmailLogType, reason: string) {
  console.warn(`[email] skipped type=${type} reason=${reason}`);
}
