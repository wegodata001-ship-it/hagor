import { PrismaClient } from "@prisma/client";

/**
 * Base Prisma client (no query extensions). Used for observability writes to avoid
 * recursive middleware / slow-query logging on telemetry inserts.
 */
const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };

export const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prismaBase = prismaBase;
