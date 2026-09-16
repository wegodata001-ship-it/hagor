import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildOrderConfirmationPdf,
  type PdfLang,
} from "@/lib/pdf/order-confirmation-pdf";

/**
 * Server-side order-confirmation PDF renderer.
 *
 * Internal reuse of the SAME `buildOrderConfirmationPdf` engine that powers:
 *   - Storefront download   (/api/orders/confirmation-pdf)
 *   - Admin invoice archive (/api/admin/invoices/[id]/pdf)
 *   - Admin invoice email
 *   - Admin invoice ZIP archive
 *
 * The customer-facing filename convention is `HAGOUR-ORDER-<orderNumber>.pdf`
 * (NOT `HAGOUR-INV-<orderNumber>.pdf`). We treat the document as an
 * "Order Confirmation" for customers because HAGOUR does not currently
 * produce a legally-formal tax invoice — using an invoice-only filename
 * here could mislead customers.
 *
 * The rendered bytes are identical to what the invoice archive produces —
 * only the filename differs. This guarantees the customer's copy always
 * matches the admin's copy.
 */

const SAFE_FILENAME_CHARS = /[^A-Za-z0-9._-]+/g;

/** Deterministic, ASCII-only filename — no PII. */
export function buildOrderConfirmationFilename(orderNumber: string | null | undefined): string {
  const raw = String(orderNumber ?? "").trim();
  const safe = raw.replace(SAFE_FILENAME_CHARS, "").slice(0, 40) || "ORDER";
  return `HAGOUR-ORDER-${safe}.pdf`;
}

export type RenderedOrderConfirmationPdf = {
  bytes: Uint8Array;
  filename: string;
  orderNumber: string;
};

/**
 * Render the order-confirmation PDF for a given order id, scoped to a store.
 * Returns `null` if the order does not exist.
 *
 * IMPORTANT: This function never performs an HTTP fetch. It reads the order
 * from Prisma and invokes the renderer in-process. It must be safe to call
 * from a webhook / server action / server component. It never modifies data.
 */
export async function renderOrderConfirmationPdfByOrderId(params: {
  storeId: string;
  orderId: string;
  lang?: PdfLang;
}): Promise<RenderedOrderConfirmationPdf | null> {
  const order = await prisma.order.findFirst({
    where: { id: params.orderId, storeId: params.storeId },
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      address: true,
      deliveryOptionName: true,
      deliveryOptionType: true,
      deliveryPrice: true,
      subtotal: true,
      discountAmount: true,
      pointsDiscountAmount: true,
      total: true,
      notes: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          selectedOptions: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          provider: true,
          amount: true,
          status: true,
          confirmationNumber: true,
          createdAt: true,
        },
      },
    },
  });
  if (!order) return null;

  const settings = await prisma.storeSettings.findUnique({
    where: { storeId: params.storeId },
    select: {
      storePhone: true,
      storeAddress: true,
      supportEmail: true,
      businessLegalName: true,
      businessTaxId: true,
      businessWebsite: true,
    },
  });
  const store = await prisma.store.findUnique({
    where: { id: params.storeId },
    select: { name: true },
  });

  const payment = order.payments[0] ?? null;
  const bytes = await buildOrderConfirmationPdf({
    order,
    lang: params.lang ?? "he",
    storePhone: settings?.storePhone,
    business: {
      displayName: store?.name ?? null,
      legalName: settings?.businessLegalName ?? null,
      taxId: settings?.businessTaxId ?? null,
      phone: settings?.storePhone ?? null,
      email: settings?.supportEmail ?? null,
      address: settings?.storeAddress ?? null,
      website: settings?.businessWebsite ?? null,
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

  return {
    bytes,
    filename: buildOrderConfirmationFilename(order.orderNumber),
    orderNumber: order.orderNumber,
  };
}
