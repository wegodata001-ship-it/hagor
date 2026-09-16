import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { STORE_ID } from "@/lib/store";
import { encodeContentDisposition, loadInvoicePdf, type InvoicePdfLang } from "@/lib/invoices/pdf";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLang(raw: string | null): InvoicePdfLang {
  if (raw === "en" || raw === "ar" || raw === "he") return raw;
  return "he";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
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
