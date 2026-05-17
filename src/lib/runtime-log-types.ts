export type RuntimeLogLevel = "error" | "warn" | "info" | "debug";

export type RuntimeLogPayload = {
  level: RuntimeLogLevel;
  scope: string;
  message: string;
  query?: string;
  durationMs?: number;
  path?: string;
  digest?: string;
  error?: string;
  stack?: string;
};
