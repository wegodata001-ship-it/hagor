export type AdminActionResult<T = undefined> =
  T extends undefined
    ? { ok: true } | { ok: false; error: string }
    : { ok: true; data: T } | { ok: false; error: string };

export function err(msg: string): { ok: false; error: string } {
  return { ok: false, error: msg };
}

export function ok<T>(data?: T): AdminActionResult<T> {
  if (data === undefined) return { ok: true } as AdminActionResult<T>;
  return { ok: true, data } as AdminActionResult<T>;
}
