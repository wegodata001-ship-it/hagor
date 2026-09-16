import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/auth/scope";
import { getCachedSession } from "@/lib/auth/cached-session";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { STORE_ID } from "@/lib/store";
import { encodeContentDisposition, loadInvoicePdf, type InvoicePdfLang } from "@/lib/invoices/pdf";
import { logAdminAction } from "@/lib/admin-audit";
import { PRODUCTION_PORTAL_URL } from "@/lib/host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLang(raw: string | null): InvoicePdfLang {
  if (raw === "en" || raw === "ar" || raw === "he") return raw;
  return "he";
}

/**
 * Distinguishes a top-level browser navigation (View PDF in a new tab) from
 * a fetch/XHR call. Browsers set `Sec-Fetch-Mode: navigate` for the former.
 * We use it to pick friendlier auth-failure handling for humans.
 */
function isBrowserNavigation(req: NextRequest): boolean {
  const mode = req.headers.get("sec-fetch-mode");
  if (mode === "navigate") return true;
  // Fallback: HTML in Accept + no explicit fetch header.
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/html") && !req.headers.get("sec-fetch-dest");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Manual auth (not requireAdminSession) so we can differentiate between
  // a browser navigation (send them to /login-admin) and a fetch call
  // (return the traditional 401 JSON so client code can react).
  const raw = await getCachedSession();
  let session;
  try {
    session = assertAdmin(raw);
  } catch {
    if (isBrowserNavigation(req)) {
      const login = new URL("/login-admin", PRODUCTION_PORTAL_URL);
      login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(login, 302);
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimit(`admin-invoice-pdf:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const lang = parseLang(req.nextUrl.searchParams.get("lang"));
  const pdf = await loadInvoicePdf({ storeId: STORE_ID, orderId: id, lang });
  if (!pdf) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    await logAdminAction({
      userId: session.userId,
      action: "invoices.pdf.download",
      entity: "Invoice",
      entityId: id,
      metadata: { documentNumber: pdf.documentNumber, orderNumber: pdf.orderNumber, lang },
    });
  } catch {
    /* audit failure must not block the download */
  }

  return new NextResponse(new Uint8Array(pdf.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": encodeContentDisposition(pdf.filename),
      "Cache-Control": "no-store",
    },
  });
}
