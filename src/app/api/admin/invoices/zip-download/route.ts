import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { STORE_ID } from "@/lib/store";
import { buildInvoiceArchive } from "@/lib/invoices/archive";
import { encodeContentDisposition } from "@/lib/invoices/pdf";
import { verifySignedInvoiceArchiveToken } from "@/lib/invoices/signed-link";

/**
 * Signed archive download endpoint.
 *
 * Only used as a **fallback** when the accountant email delivery mode is
 * "link" because the ZIP would exceed the SMTP attachment budget. The token
 * carries the exact invoice-id list, is HMAC-signed with the server secret,
 * and expires (default 7 days). No admin session is required — the
 * capability lives in the signed link itself, which is only ever generated
 * from an authenticated admin flow.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  if (!rateLimit(`invoice-zip-download:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get("t")?.trim() || "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }
  const payload = verifySignedInvoiceArchiveToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized or expired link" }, { status: 401 });
  }

  let archive;
  try {
    archive = await buildInvoiceArchive({
      storeId: STORE_ID,
      orderIds: payload.ids,
      archiveLabel: payload.label,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "archive_failed" },
      { status: 500 },
    );
  }

  const headers = new Headers({
    "Content-Type": "application/zip",
    "Content-Disposition": encodeContentDisposition(archive.filename),
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Invoice-Count": String(archive.fileCount),
    "X-Invoice-Failed": String(archive.failed.length),
  });

  return new NextResponse(new Uint8Array(archive.zip), { status: 200, headers });
}
