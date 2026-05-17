import { cache } from "react";
import { getSession } from "@/lib/auth/session";

/**
 * Per-request memoized session decode — avoids duplicate cookie/JWT work when
 * multiple Server Components call session in the same render tree.
 */
export const getCachedSession = cache(getSession);
