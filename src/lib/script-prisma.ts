import { PrismaClient } from "@prisma/client";
import { normalizeSupabaseDatabaseUrl } from "@/lib/database-url";

function isPoolerUrl(url: string): boolean {
  return url.includes("pooler.supabase.com") || /pgbouncer=true/i.test(url);
}

/** Session pooler (:5432) — supports DDL; reachable when db.*.supabase.co:5432 is blocked. */
export function toSessionPoolerUrl(url: string): string {
  let out = url.trim();
  out = out.replace(/pooler\.supabase\.com:6543/i, "pooler.supabase.com:5432");

  const qIdx = out.indexOf("?");
  const base = qIdx >= 0 ? out.slice(0, qIdx) : out;
  const params = new URLSearchParams(qIdx >= 0 ? out.slice(qIdx + 1) : "");
  params.delete("pgbouncer");
  params.set("connection_limit", "1");
  params.delete("pool_timeout");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * URL for `db:safe-sync` and other DDL scripts.
 * Prefers Supabase session pooler (pooler host :5432) derived from DATABASE_URL.
 */
export function resolveMigrationDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl?.includes("pooler.supabase.com")) {
    return toSessionPoolerUrl(databaseUrl);
  }

  const direct = process.env.DIRECT_URL?.trim();
  if (direct?.includes("pooler.supabase.com:5432")) {
    return toSessionPoolerUrl(direct);
  }

  // db.*.supabase.co:5432 is often blocked on local networks — fall back to pooler from DATABASE_URL
  if (direct?.includes("db.") && direct.includes(".supabase.co") && databaseUrl) {
    if (databaseUrl.includes("pooler.supabase.com")) {
      return toSessionPoolerUrl(databaseUrl);
    }
  }

  if (direct && !isPoolerUrl(direct)) {
    return direct;
  }

  if (direct) {
    return toSessionPoolerUrl(direct);
  }

  const base = normalizeSupabaseDatabaseUrl(databaseUrl);
  if (!base) {
    throw new Error("Missing DATABASE_URL in environment");
  }
  return toSessionPoolerUrl(base);
}

/** CLI scripts (reads/writes): transaction pooler or direct when available. */
export function resolveScriptDatabaseUrl(): string {
  const base = normalizeSupabaseDatabaseUrl(process.env.DATABASE_URL);
  if (base) return base;

  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;

  throw new Error("Missing DATABASE_URL in environment");
}

export function createScriptPrisma(options?: { forMigration?: boolean }): PrismaClient {
  const url = options?.forMigration ? resolveMigrationDatabaseUrl() : resolveScriptDatabaseUrl();
  return new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });
}
