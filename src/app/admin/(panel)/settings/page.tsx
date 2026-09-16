import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";

/**
 * "Store settings" is intentionally hidden from the admin sidebar — the store
 * owner rarely needs it. If someone lands on `/admin/settings` (bookmark,
 * external link, autocomplete), redirect them to the invoice archive where
 * the useful bits (accountant, business details, saved recipients) are
 * managed inline.
 *
 * Do NOT delete this route or the underlying settings client component:
 * - `saveStoreSettings` in `src/app/admin/actions.ts` still writes the same
 *    StoreSettings row used by the storefront and invoice PDFs.
 * - Sub-routes `/admin/settings/terms`, `/admin/settings/email` remain
 *   directly reachable and unchanged.
 * - The settings client component itself is unused for now but is preserved
 *   in `src/components/admin/settings-admin-client.tsx` so a future admin
 *   role/page can render it again without extra work.
 */
export const dynamic = "force-dynamic";

export default async function AdminSettingsRedirect() {
  await requireAdminSession();
  redirect("/admin/invoices");
}
