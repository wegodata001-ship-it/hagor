import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { rateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { STORE_ID } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";
import { loadInvoicePdf, type InvoicePdfLang } from "@/lib/invoices/pdf";
import { sendSingleInvoicePdfEmail } from "@/lib/invoices/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  recipient: z.string().email().optional(),
  lang: z.enum(["he", "ar", "en"]).optional(),
});

export async function POST(
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
  if (!rateLimit(`admin-invoice-single-email:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: STORE_ID },
    select: { accountantName: true, accountantEmail: true },
  });
  const to = (parsed.data.recipient || settings?.accountantEmail || "").trim();
  if (!to) {
    return NextResponse.json(
      { error: "לא מוגדר מייל רואה חשבון. יש למלא את הפרטים בהגדרות." },
      { status: 400 },
    );
  }

  const lang: InvoicePdfLang = parsed.data.lang ?? "he";
  const pdf = await loadInvoicePdf({ storeId: STORE_ID, orderId: id, lang });
  if (!pdf) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Recipient name: use the saved accountant name only if the accountant is the actual recipient.
  const isAccountant =
    !!settings?.accountantEmail && to.toLowerCase() === settings.accountantEmail.toLowerCase();
  const toName = isAccountant ? settings?.accountantName?.trim() || undefined : undefined;

  const outcome = await sendSingleInvoicePdfEmail({
    to,
    toName,
    documentNumber: pdf.documentNumber,
    orderNumber: pdf.orderNumber,
    pdf: pdf.bytes,
    filename: pdf.filename,
  });

  try {
    await logAdminAction({
      userId: session.userId,
      action: "invoices.email.single",
      entity: "Invoice",
      entityId: id,
      metadata: {
        recipient: to,
        documentNumber: pdf.documentNumber,
        orderNumber: pdf.orderNumber,
        ok: outcome.ok,
        provider: outcome.provider,
        providerMessageId: outcome.messageId,
        errorCode: outcome.errorCode,
        errorMessage: outcome.errorMessage,
      },
    });
  } catch {
    /* audit is best-effort */
  }

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.errorMessage || "שליחת החשבונית נכשלה",
        errorCode: outcome.errorCode,
        provider: outcome.provider,
      },
      { status: outcome.errorCode === "EMAIL_NOT_CONFIGURED" ? 503 : 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    recipient: to,
    provider: outcome.provider,
    messageId: outcome.messageId,
  });
}
