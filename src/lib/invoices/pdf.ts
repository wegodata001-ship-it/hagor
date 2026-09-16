import "server-only";

import type { OrderPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildOrderConfirmationPdf,
  type PdfLang,
} from "@/lib/pdf/order-confirmation-pdf";
import { INVOICE_PAYMENT_STATUSES, invoiceDocumentNumber } from "@/lib/invoices/data";

/**
 * Invoice PDF renderer.
 *
 * IMPORTANT: We deliberately reuse the *existing* order confirmation renderer
 * so that a downloaded invoice matches the receipt the customer already has.
 * No new invoice numbering, no re-computed totals, no re-derived VAT.
 */

export type InvoicePdfLang = PdfLang;

export type InvoicePdfResult = {
  bytes: Uint8Array;
  filename: string;
  documentNumber: string;
  orderNumber: string;
};

/** Load one invoice PDF (bytes + safe filename) by order id, scoped to a store. */
export async function loadInvoicePdf(params: {
  storeId: string;
  orderId: string;
  lang?: InvoicePdfLang;
}): Promise<InvoicePdfResult | null> {
  const order = await prisma.order.findFirst({
    where: {
      id: params.orderId,
      storeId: params.storeId,
      paymentStatus: {
        in: [...INVOICE_PAYMENT_STATUSES] as OrderPaymentStatus[],
      },
      status: { notIn: ["CANCELLED", "FAILED"] },
    },
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
        // Prefer the settled/most-recent payment for display.
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

  const documentNumber = invoiceDocumentNumber(order.orderNumber);
  return {
    bytes,
    filename: buildInvoiceFilename(order.orderNumber),
    documentNumber,
    orderNumber: order.orderNumber,
  };
}

const SAFE_FILENAME_CHARS = /[^A-Za-z0-9._-]+/g;

/** Deterministic, ASCII-only filename — no PII. */
export function buildInvoiceFilename(orderNumber: string): string {
  const safe = String(orderNumber).replace(SAFE_FILENAME_CHARS, "").slice(0, 40) || "ORDER";
  return `HAGOUR-${invoiceDocumentNumber(safe)}.pdf`;
}

/** Format a Content-Disposition value using RFC 5987 for non-ASCII safety. */
export function encodeContentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
