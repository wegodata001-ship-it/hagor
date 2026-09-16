import "server-only";

import { Prisma, type OrderPaymentStatus, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Invoice archive data layer.
 *
 * SOURCE OF TRUTH: the archive treats every paid Order as an existing invoice.
 * We NEVER recompute totals, numbers, VAT, or dates — we read them straight
 * from the Order row. The invoice document number is the order number so it
 * stays stable across sessions.
 */

/** Payment statuses that qualify as an issued invoice. */
export const INVOICE_PAYMENT_STATUSES = ["PAID", "TEST_PAID", "DEMO_PAID"] as const;

export type InvoiceRowDTO = {
  id: string;
  orderNumber: string;
  documentNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  paymentStatus: string;
  status: string;
  deliveryOptionType: string;
};

export type InvoiceFilters = {
  q?: string;
  from?: string | null;
  to?: string | null;
  ids?: string[] | null;
};

/** Stable invoice document number derived from the order number. */
export function invoiceDocumentNumber(orderNumber: string): string {
  return `INV-${orderNumber}`;
}

function buildWhere(storeId: string, f: InvoiceFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    storeId,
    paymentStatus: { in: [...INVOICE_PAYMENT_STATUSES] as OrderPaymentStatus[] },
    status: { notIn: ["CANCELLED", "FAILED"] as OrderStatus[] },
  };

  const q = f.q?.trim() || "";
  if (q) {
    // Also match document number (INV-<orderNumber>).
    const bareOrderNumber = q.replace(/^inv[-_]/i, "").trim();
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { orderNumber: { contains: bareOrderNumber, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  if (f.from || f.to) {
    const range: Prisma.DateTimeFilter = {};
    if (f.from) {
      const d = new Date(f.from);
      if (!Number.isNaN(d.getTime())) range.gte = d;
    }
    if (f.to) {
      const d = new Date(f.to);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        range.lte = d;
      }
    }
    if (Object.keys(range).length > 0) where.createdAt = range;
  }

  if (Array.isArray(f.ids) && f.ids.length > 0) {
    const clean = f.ids.map((s) => s.trim()).filter(Boolean);
    if (clean.length === 0) {
      // Nothing to match — signal by forcing a false predicate.
      where.id = "___NONE___";
    } else {
      where.id = { in: clean };
    }
  }

  return where;
}

/** List invoice rows matching filters. Bounded by `take` for the table view. */
export async function listInvoices(
  storeId: string,
  filters: InvoiceFilters,
  opts?: { take?: number; skip?: number },
): Promise<InvoiceRowDTO[]> {
  const take = Math.min(Math.max(1, opts?.take ?? 200), 500);
  const skip = Math.max(0, opts?.skip ?? 0);

  const rows = await prisma.order.findMany({
    where: buildWhere(storeId, filters),
    orderBy: { createdAt: "desc" },
    take,
    skip,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      total: true,
      paymentStatus: true,
      status: true,
      deliveryOptionType: true,
    },
  });

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    documentNumber: invoiceDocumentNumber(o.orderNumber),
    createdAt: o.createdAt.toISOString(),
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    total: Number(o.total),
    paymentStatus: o.paymentStatus,
    status: o.status,
    deliveryOptionType: o.deliveryOptionType,
  }));
}

/** Count invoices matching filters (used for "select all N results" affordance). */
export async function countInvoices(storeId: string, filters: InvoiceFilters): Promise<number> {
  return prisma.order.count({ where: buildWhere(storeId, filters) });
}

/** Return the ordered list of ids matching filters — bounded for safety. */
export async function listInvoiceIds(
  storeId: string,
  filters: InvoiceFilters,
  max = 5000,
): Promise<string[]> {
  const rows = await prisma.order.findMany({
    where: buildWhere(storeId, filters),
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(1, max), 10_000),
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export type InvoiceArchiveSummary = {
  totalAll: number;
  totalInPeriod: number;
  totalThisMonth: number;
};

/** Small header summary for the archive page. */
export async function loadInvoiceSummary(
  storeId: string,
  filters: InvoiceFilters,
): Promise<InvoiceArchiveSummary> {
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAll, totalInPeriod, totalThisMonth] = await Promise.all([
    prisma.order.count({ where: buildWhere(storeId, {}) }),
    prisma.order.count({ where: buildWhere(storeId, filters) }),
    prisma.order.count({
      where: {
        ...buildWhere(storeId, {}),
        createdAt: { gte: startThisMonth },
      },
    }),
  ]);

  return { totalAll, totalInPeriod, totalThisMonth };
}
