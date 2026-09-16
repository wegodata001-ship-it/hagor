import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { describeEmailProvider } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invoices/email-status — admin diagnostics.
 *
 * Returns provider identity, config completeness, and a redacted view of the
 * saved accountant. NEVER returns API keys, SMTP passwords, or any other
 * secret. Used by the invoice-archive UI to show a red banner when email is
 * disabled so operators can act on the exact missing envs.
 */
export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const desc = describeEmailProvider();
  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: { accountantName: true, accountantEmail: true },
  });

  return NextResponse.json({
    provider: desc.provider,
    configured: desc.configured,
    missingEnv: desc.missing,
    fromAddress: desc.fromAddress ?? null,
    fromName: desc.fromName ?? null,
    accountantName: settings?.accountantName ?? null,
    accountantEmail: settings?.accountantEmail ?? null,
  });
}
