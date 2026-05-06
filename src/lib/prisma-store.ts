import { STORE_ID } from "@/lib/store";

/** Merge `storeId` into a Prisma `where` clause (flat models with top-level storeId). */
export function whereStore<W extends Record<string, unknown>>(
  where: W = {} as W,
): W & { storeId: string } {
  return { ...where, storeId: STORE_ID };
}

/** Same as `whereStore` — explicit alias for queries. */
export const scopeWhere = whereStore;

/**
 * Wrap findMany args: `{ where: { active: true } }` → adds storeId.
 * Shallow merge only; use `whereStore` for nested cases.
 */
export function scopeFindManyArgs<T extends { where?: object }>(
  args: T = {} as T,
): T & { where: { storeId: string } & Record<string, unknown> } {
  const w = (args as { where?: object }).where ?? {};
  return {
    ...args,
    where: { storeId: STORE_ID, ...w },
  };
}
