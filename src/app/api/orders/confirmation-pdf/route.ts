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
  const payment = loaded.order.payments[0] ?? null;
  const bytes = await buildOrderConfirmationPdf({
    order: loaded.order,
    lang,
    storePhone: loaded.settings?.storePhone,
    business: {
      displayName: loaded.store?.name ?? null,
      legalName: loaded.settings?.businessLegalName ?? null,
      taxId: loaded.settings?.businessTaxId ?? null,
      phone: loaded.settings?.storePhone ?? null,
      email: loaded.settings?.supportEmail ?? null,
      address: loaded.settings?.storeAddress ?? null,
      website: loaded.settings?.businessWebsite ?? null,
    },
    payment: payment
      ? {
          provider: payment.provider,
          amount: Number(payment.amount),
          paidAt: payment.createdAt,
          status: payment.status,
          confirmationNumber: payment.confirmationNumber,
        }
      : null,
  });

  // Deterministic ASCII-only filename: HAGOUR-ORDER-<orderNumber>.pdf
  const safeOrder = String(loaded.order.orderNumber).replace(/[^A-Za-z0-9._-]+/g, "");
  const filename = `HAGOUR-ORDER-${safeOrder || "ORDER"}.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
