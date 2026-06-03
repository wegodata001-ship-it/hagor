/** Normalize Supabase pooler URL for Prisma (transaction pooler + sane pool size). */
export function normalizeSupabaseDatabaseUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return url;
  let out = url.trim();

  // Session pooler (:5432) exhausts pool_size — use transaction pooler (:6543).
  if (out.includes("pooler.supabase.com:5432")) {
    out = out.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }

  if (!/pgbouncer=/i.test(out)) {
    out += out.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }

  const isDev = process.env.NODE_ENV === "development";
  const defaultLimit = isDev ? "8" : "5";
  const limit = process.env.PRISMA_CONNECTION_LIMIT?.trim() || defaultLimit;
  const poolTimeout = process.env.PRISMA_POOL_TIMEOUT?.trim() || "30";

  if (/connection_limit=\d+/i.test(out)) {
    out = out.replace(/connection_limit=\d+/i, `connection_limit=${limit}`);
  } else {
    out += out.includes("?") ? `&connection_limit=${limit}` : `?connection_limit=${limit}`;
  }

  if (/pool_timeout=\d+/i.test(out)) {
    out = out.replace(/pool_timeout=\d+/i, `pool_timeout=${poolTimeout}`);
  } else {
    out += out.includes("?") ? `&pool_timeout=${poolTimeout}` : `?pool_timeout=${poolTimeout}`;
  }

  return out;
}
