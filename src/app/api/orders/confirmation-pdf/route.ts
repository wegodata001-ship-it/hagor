import { NextRequest, NextResponse } from "next/server";
import { loadOrderForConfirmationPdf } from "@/lib/order-tracking-access";
import { buildOrderConfirmationPdf, type PdfLang } from "@/lib/pdf/order-confirmation-pdf";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLang(raw: string | null): PdfLang {
  if (raw === "en" || raw === "ar" || raw === "he") return raw;
  return "he";
}

export async function GET(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  if (!rateLimit(`order-pdf:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get("t")?.trim() || "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const loaded = await loadOrderForConfirmationPdf(token);
  if (!loaded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lang = parseLang(req.nextUrl.searchParams.get("lang"));
  const bytes = await buildOrderConfirmationPdf({
    order: loaded.order,
    lang,
    storePhone: loaded.settings?.storePhone,
  });

  const filename = `HAGOUR-ORDER-${loaded.order.orderNumber}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
