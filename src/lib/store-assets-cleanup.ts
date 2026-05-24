import { STORAGE_BUCKET } from "@/lib/storage";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Top-level storage folders that must not exist in HAGOUR. */
export const BLOCKED_STORAGE_ROOTS = [
  "electronics",
  "demo",
  "phones",
  "laptops",
  "desigma",
  "base",
] as const;

async function listAllPaths(prefix: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const paths: string[] = [];
  const queue = [prefix.replace(/\/+$/, "")];

  while (queue.length > 0) {
    const current = queue.pop()!;
    let offset = 0;
    const limit = 100;

    for (;;) {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(current, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      if (!data?.length) break;

      for (const item of data) {
        const full = current ? `${current}/${item.name}` : item.name;
        if (item.id) {
          paths.push(full);
        } else {
          queue.push(full);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  return paths;
}

export async function deleteBlockedStorageRoots(): Promise<{ removed: string[]; errors: string[] }> {
  const supabase = getSupabaseAdmin();
  const removed: string[] = [];
  const errors: string[] = [];

  for (const root of BLOCKED_STORAGE_ROOTS) {
    try {
      const paths = await listAllPaths(root);
      if (paths.length === 0) {
        const { data: top } = await supabase.storage.from(STORAGE_BUCKET).list(root, { limit: 1 });
        if (!top?.length) continue;
      }

      const batchSize = 100;
      const toDelete = paths.length > 0 ? paths : [`${root}/.keep`];
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const chunk = toDelete.slice(i, i + batchSize);
        const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);
        if (error) {
          errors.push(`${root}: ${error.message}`);
        }
      }
      removed.push(root);
    } catch (e) {
      errors.push(`${root}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { removed, errors };
}
