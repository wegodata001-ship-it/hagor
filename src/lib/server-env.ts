import "server-only";

function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const DATABASE_URL = requireServerEnv("DATABASE_URL");
export const DIRECT_URL = process.env.DIRECT_URL || DATABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
export const PAYMENT_WEBHOOK_SECRET = requireServerEnv("PAYMENT_WEBHOOK_SECRET");
export const SESSION_SECRET = requireServerEnv("SESSION_SECRET");
export const JWT_SECRET = requireServerEnv("JWT_SECRET");

