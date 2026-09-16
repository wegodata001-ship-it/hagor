import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { STORE_ID } from "@/lib/store";
import { logAdminAction } from "@/lib/admin-audit";
import { buildInvoiceArchive } from "@/lib/invoices/archive";
import { encodeContentDisposition } from "@/lib/invoices/pdf";
import { listInvoiceIds, type InvoiceFilters } from "@/lib/invoices/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string().trim().min(1)).max(1000).optional(),
  filters: z
    .object({
      q: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
  scope: z.enum(["ids", "filtered", "all", "month"]).default("ids"),
  archiveLabel: z.string().max(60).optional(),
  lang: z.enum(["he", "ar", "en"]).optional(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimit(`admin-invoice-zip:${ip}`, 10, 60_000)) {
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

  let ids: string[] = [];
  const filters: InvoiceFilters = {
    q: input.filters?.q,
    from: input.filters?.from,
    to: input.filters?.to,
  };
  let archiveLabel = input.archiveLabel?.trim() || "";

  if (input.scope === "ids") {
    ids = Array.from(new Set((input.ids || []).map((s) => s.trim()).filter(Boolean)));
  } else if (input.scope === "month") {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    ids = await listInvoiceIds(STORE_ID, { from: from.toISOString(), to: to.toISOString() });
    if (!archiveLabel) archiveLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  } else if (input.scope === "filtered") {
    ids = await listInvoiceIds(STORE_ID, filters);
  } else if (input.scope === "all") {
    ids = await listInvoiceIds(STORE_ID, {});
    if (!archiveLabel) archiveLabel = "all";
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "No invoices to archive" }, { status: 400 });
  }
  if (ids.length > 1000) {
    return NextResponse.json(
      { error: `Too many invoices: ${ids.length}. Please narrow the filter.` },
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
    const msg = err instanceof Error ? err.message : "archive_failed";
    if (msg === "EMPTY_SELECTION") {
      return NextResponse.json({ error: "No invoices selected" }, { status: 400 });
    }
    if (msg.startsWith("TOO_MANY_INVOICES")) {
      return NextResponse.json({ error: msg }, { status: 413 });
    }
    if (msg === "ALL_INVOICES_FAILED") {
      return NextResponse.json({ error: "Failed to render any invoice" }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  try {
    await logAdminAction({
      userId: session.userId,
      action: "invoices.zip.download",
      entity: "Invoice",
      metadata: {
        scope: input.scope,
        requested: ids.length,
        included: archive.fileCount,
        failed: archive.failed.length,
        bytes: archive.bytes,
        archiveFilename: archive.filename,
      },
    });
  } catch {
    /* audit is best-effort */
  }

  const headers = new Headers({
    "Content-Type": "application/zip",
    "Content-Disposition": encodeContentDisposition(archive.filename),
    "Cache-Control": "no-store",
    "X-Invoice-Count": String(archive.fileCount),
    "X-Invoice-Failed": String(archive.failed.length),
  });
  if (archive.failed.length > 0) {
    headers.set(
      "X-Invoice-Failures",
      Buffer.from(JSON.stringify(archive.failed)).toString("base64"),
    );
  }

  return new NextResponse(new Uint8Array(archive.zip), { status: 200, headers });
}
