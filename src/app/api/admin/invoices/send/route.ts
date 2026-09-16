import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { STORE_ID } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { buildInvoiceArchive } from "@/lib/invoices/archive";
import { listInvoiceIds } from "@/lib/invoices/data";
import { sendInvoiceArchiveToAccountant } from "@/lib/invoices/email";
import { recordInvoiceSend } from "@/lib/invoices/send-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  scope: z.enum(["ids", "filtered", "all", "month"]).default("ids"),
  ids: z.array(z.string().trim().min(1)).max(1000).optional(),
  filters: z
    .object({
      q: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
  archiveLabel: z.string().max(60).optional(),
  /** Optional override of the stored accountant address (validated). */
  recipientOverride: z.string().email().optional(),
  lang: z.enum(["he", "ar", "en"]).optional(),
});

function monthPeriod(): { from: string; to: string; label: string; subject: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  to.setHours(23, 59, 59, 999);
  const label = `${from.toLocaleDateString("he-IL")} – ${to.toLocaleDateString("he-IL")}`;
  const subject = `${String(from.getMonth() + 1).padStart(2, "0")}/${from.getFullYear()}`;
  return { from: from.toISOString(), to: to.toISOString(), label, subject };
}

function periodLabel(from?: string | null, to?: string | null): { label: string; subject: string } {
  const fmt = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString("he-IL") : null;
  const fromLbl = fmt(from);
  const toLbl = fmt(to);
  if (fromLbl && toLbl) return { label: `${fromLbl} – ${toLbl}`, subject: monthSubject(from ?? undefined) };
  if (fromLbl) return { label: `החל מ־${fromLbl}`, subject: monthSubject(from ?? undefined) };
  if (toLbl) return { label: `עד ${toLbl}`, subject: monthSubject(to ?? undefined) };
  return { label: "כל התקופות", subject: "כל התקופות" };
}

function monthSubject(date?: string): string {
  if (!date) return new Date().toLocaleDateString("he-IL", { month: "2-digit", year: "numeric" });
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString("he-IL", { month: "2-digit", year: "numeric" });
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimit(`admin-invoice-send:${ip}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Resolve accountant address (allow one-off override, else stored setting).
  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: { accountantName: true, accountantEmail: true },
  });
  const accountantEmail = (input.recipientOverride || settings?.accountantEmail || "").trim();
  const accountantName = settings?.accountantName?.trim() || undefined;
  if (!accountantEmail) {
    return NextResponse.json(
      { error: "לא מוגדר מייל רואה חשבון. יש למלא את הפרטים בהגדרות." },
      { status: 400 },
    );
  }

  // Resolve invoice ids + period metadata.
  let ids: string[] = [];
  let archiveLabel = input.archiveLabel?.trim() || "";
  let period = periodLabel(input.filters?.from, input.filters?.to);
  let periodFrom = input.filters?.from ?? null;
  let periodTo = input.filters?.to ?? null;

  if (input.scope === "ids") {
    ids = Array.from(new Set((input.ids || []).map((s) => s.trim()).filter(Boolean)));
    period = { label: `${ids.length} מסמכים נבחרים`, subject: period.subject };
  } else if (input.scope === "month") {
    const m = monthPeriod();
    ids = await listInvoiceIds(STORE_ID, { from: m.from, to: m.to });
    period = { label: m.label, subject: m.subject };
    periodFrom = m.from;
    periodTo = m.to;
    if (!archiveLabel) {
      const d = new Date();
      archiveLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  } else if (input.scope === "filtered") {
    ids = await listInvoiceIds(STORE_ID, {
      q: input.filters?.q,
      from: input.filters?.from,
      to: input.filters?.to,
    });
  } else if (input.scope === "all") {
    ids = await listInvoiceIds(STORE_ID, {});
    period = { label: "כל התקופות", subject: "ALL" };
    if (!archiveLabel) archiveLabel = "all";
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "אין חשבוניות לשליחה." }, { status: 400 });
  }
  if (ids.length > 1000) {
    return NextResponse.json(
      { error: `יש יותר מדי חשבוניות (${ids.length}). נא לצמצם את הסינון.` },
      { status: 413 },
    );
  }

  let archive;
  try {
    archive = await buildInvoiceArchive({
      storeId: STORE_ID,
      orderIds: ids,
      lang: input.lang ?? "he",
      archiveLabel: archiveLabel || undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "archive_failed" },
      { status: 500 },
    );
  }

  const outcome = await sendInvoiceArchiveToAccountant({
    ctx: {
      to: accountantEmail,
      toName: accountantName,
      periodLabel: period.label,
      subjectPeriod: period.subject,
    },
    archive,
    orderIds: ids,
    archiveLabel: archiveLabel || undefined,
  });

  // §15: only mark "accepted" when the provider confirmed acceptance. "Delivered"
  // requires webhook events (not implemented yet), so we never claim "delivered".
  // `recordInvoiceSend` is the single source of truth for send-history.
  try {
    await recordInvoiceSend({
      storeId: STORE_ID,
      userId: session.userId,
      metadata: {
        recipient: accountantEmail,
        invoiceCount: archive.fileCount,
        periodFrom,
        periodTo,
        periodLabel: period.label,
        archiveFilename: archive.filename,
        bytes: archive.bytes,
        mode: outcome.mode ?? "attachment",
        status: outcome.ok ? "accepted" : "failed",
        provider: outcome.provider,
        providerMessageId: outcome.messageId,
        errorCode: outcome.errorCode,
        error: outcome.ok ? undefined : outcome.errorMessage,
      },
    });
  } catch {
    /* audit is best-effort — never block the response on it */
  }

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.errorMessage || "שליחת החשבוניות נכשלה",
        errorCode: outcome.errorCode,
        provider: outcome.provider,
        fileCount: outcome.fileCount,
        bytes: outcome.bytes,
      },
      { status: outcome.errorCode === "EMAIL_NOT_CONFIGURED" ? 503 : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: outcome.mode,
    provider: outcome.provider,
    messageId: outcome.messageId,
    fileCount: outcome.fileCount,
    bytes: outcome.bytes,
    downloadUrl: outcome.downloadUrl,
    linkExpiresAt: outcome.linkExpiresAt,
    period: period.label,
    recipient: accountantEmail,
    failed: archive.failed,
  });
}
