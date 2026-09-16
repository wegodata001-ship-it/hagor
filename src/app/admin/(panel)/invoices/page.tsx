import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { requireAdminSession } from "@/lib/admin-auth";
import { safeQuery } from "@/lib/server/safe-query";
import {
  countInvoices,
  listInvoices,
  loadInvoiceSummary,
  type InvoiceFilters,
  type InvoiceRowDTO,
  type InvoiceArchiveSummary,
} from "@/lib/invoices/data";
import {
  listInvoiceSendHistory,
  type InvoiceSendHistoryEntry,
} from "@/lib/invoices/send-history";
import { InvoicesAdminClient } from "@/components/admin/invoices-admin-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getStringParam(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

const FALLBACK: {
  rows: InvoiceRowDTO[];
  totalMatching: number;
  summary: InvoiceArchiveSummary;
  history: InvoiceSendHistoryEntry[];
} = {
  rows: [],
  totalMatching: 0,
  summary: { totalAll: 0, totalInPeriod: 0, totalThisMonth: 0 },
  history: [],
};

export default async function AdminInvoicesArchivePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const storeId = STORE_ID;

  const sp = (await searchParams) ?? {};
  const q = getStringParam(sp.q).trim();
  const from = getStringParam(sp.from).trim();
  const to = getStringParam(sp.to).trim();

  const filters: InvoiceFilters = {
    q,
    from: from || null,
    to: to || null,
  };

  const data = await safeQuery(
    "admin.invoices",
    async () => {
      const [rows, totalMatching, summary, history] = await Promise.all([
        listInvoices(storeId, filters, { take: 200 }),
        countInvoices(storeId, filters),
        loadInvoiceSummary(storeId, filters),
        listInvoiceSendHistory(storeId, 20),
      ]);
      return { rows, totalMatching, summary, history };
    },
    FALLBACK,
    { timeoutMs: 25_000 },
  );

  const settings = await safeQuery(
    "admin.invoices.settings",
    () =>
      prisma.storeSettings.findUnique({
        where: { storeId },
        select: { accountantName: true, accountantEmail: true },
      }),
    null,
    { timeoutMs: 10_000 },
  );

  return (
    <InvoicesAdminClient
      initialFilters={{ q, from, to }}
      rows={data.rows}
      totalMatching={data.totalMatching}
      summary={data.summary}
      history={data.history}
      accountantName={settings?.accountantName ?? null}
      accountantEmail={settings?.accountantEmail ?? null}
    />
  );
}
