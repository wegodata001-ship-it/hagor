import { PrismaClient } from "@prisma/client";
import { normalizeSupabaseDatabaseUrl } from "@/lib/database-url";

/**
 * Base Prisma client (no query extensions). Used for observability writes to avoid
 * recursive middleware / slow-query logging on telemetry inserts.
 */
const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prismaDatasourceUrl?: string;
};

function getDatasourceUrl(): string | undefined {
  return normalizeSupabaseDatabaseUrl(process.env.DATABASE_URL);
}

function createPrismaClient(): PrismaClient {
  const url = getDatasourceUrl();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** After `prisma generate`, dev HMR can keep an old client without new models (e.g. Review). */
function staleDevClient(client: PrismaClient | undefined): boolean {
  if (process.env.NODE_ENV !== "development" || !client) return false;
  return typeof (client as PrismaClient & { review?: unknown }).review === "undefined";
}

const datasourceUrl = getDatasourceUrl();

if (
  globalForPrisma.prismaBase &&
  (staleDevClient(globalForPrisma.prismaBase) ||
    (datasourceUrl && globalForPrisma.prismaDatasourceUrl !== datasourceUrl))
) {
  void globalForPrisma.prismaBase.$disconnect();
  globalForPrisma.prismaBase = undefined;
}

export const prismaBase = globalForPrisma.prismaBase ?? createPrismaClient();

globalForPrisma.prismaBase = prismaBase;
globalForPrisma.prismaDatasourceUrl = datasourceUrl;
