import { prisma } from "@/lib/prisma";
import { isObservabilityDbEnabled } from "@/lib/observability/config";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? null;
}

export type ObservabilityDashboardData = {
  storeId: string;
  since24h: string;
  since1h: string;
  summary24h: {
    errors: number;
    warns: number;
    timeouts: number;
    slowSafeQueries: number;
    prismaSlow: number;
    prismaFailures: number;
    authSamples: number;
    authAvgMs: number | null;
    authP50Ms: number | null;
    authP95Ms: number | null;
  };
  groupedErrors: Array<{
    message: string;
    queryKey: string | null;
    path: string | null;
    count: number;
  }>;
  slowSafeQueries: Array<{
    queryKey: string | null;
    path: string | null;
    count: number;
    maxMs: number;
    avgMs: number;
  }>;
  prismaSlow: Array<{
    queryKey: string | null;
    count: number;
    maxMs: number;
    avgMs: number;
  }>;
  prismaFailures: Array<{
    queryKey: string | null;
    count: number;
  }>;
  topFailingRoutes: Array<{ path: string; count: number }>;
  timeouts: Array<{
    queryKey: string | null;
    path: string | null;
    count: number;
  }>;
  recentTraces: Array<{ traceId: string; events: number }>;
};

function emptyObservabilityDashboard(storeId: string): ObservabilityDashboardData {
  const t24 = hoursAgo(24);
  const t1 = hoursAgo(1);
  return {
    storeId,
    since24h: t24.toISOString(),
    since1h: t1.toISOString(),
    summary24h: {
      errors: 0,
      warns: 0,
      timeouts: 0,
      slowSafeQueries: 0,
      prismaSlow: 0,
      prismaFailures: 0,
      authSamples: 0,
      authAvgMs: null,
      authP50Ms: null,
      authP95Ms: null,
    },
    groupedErrors: [],
    slowSafeQueries: [],
    prismaSlow: [],
    prismaFailures: [],
    topFailingRoutes: [],
    timeouts: [],
    recentTraces: [],
  };
}

export async function loadObservabilityDashboard(storeId: string): Promise<ObservabilityDashboardData> {
  if (!isObservabilityDbEnabled()) {
    return emptyObservabilityDashboard(storeId);
  }

  const t24 = hoursAgo(24);
  const t1 = hoursAgo(1);

  const base = { storeId, createdAt: { gte: t24 as Date } };

  const [
    errors,
    warns,
    timeoutsCount,
    slowSafeCount,
    prismaSlowCount,
    prismaFailCount,
    groupedErrorsRaw,
    slowSafeRaw,
    prismaSlowRaw,
    prismaFailGrouped,
    failingRoutesRaw,
    timeoutsGrouped,
    authRows,
    traceRows,
  ] = await Promise.all([
    prisma.observabilityEvent.count({ where: { ...base, level: "error" } }),
    prisma.observabilityEvent.count({ where: { ...base, level: "warn" } }),
    prisma.observabilityEvent.count({ where: { ...base, message: "query_timeout" } }),
    prisma.observabilityEvent.count({ where: { ...base, scope: "safe_query", message: "query_slow" } }),
    prisma.observabilityEvent.count({ where: { ...base, scope: "prisma", message: "prisma_query" } }),
    prisma.observabilityEvent.count({ where: { ...base, scope: "prisma", message: "prisma_query_failed" } }),
    prisma.observabilityEvent.groupBy({
      by: ["message", "queryKey", "path"],
      where: { ...base, level: "error" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 30,
    }),
    prisma.observabilityEvent.groupBy({
      by: ["queryKey", "path"],
      where: { ...base, scope: "safe_query", message: "query_slow" },
      _count: { id: true },
      _avg: { durationMs: true },
      _max: { durationMs: true },
      orderBy: { _max: { durationMs: "desc" } },
      take: 25,
    }),
    prisma.observabilityEvent.groupBy({
      by: ["queryKey"],
      where: { ...base, scope: "prisma", message: "prisma_query" },
      _count: { id: true },
      _avg: { durationMs: true },
      _max: { durationMs: true },
      orderBy: { _max: { durationMs: "desc" } },
      take: 25,
    }),
    prisma.observabilityEvent.groupBy({
      by: ["queryKey"],
      where: { ...base, scope: "prisma", message: "prisma_query_failed" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    prisma.observabilityEvent.groupBy({
      by: ["path"],
      where: { ...base, level: "error", path: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    prisma.observabilityEvent.groupBy({
      by: ["queryKey", "path"],
      where: { ...base, message: "query_timeout" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    prisma.observabilityEvent.findMany({
      where: {
        storeId,
        createdAt: { gte: t24 },
        scope: "api",
        message: "auth.me",
        durationMs: { not: null },
      },
      select: { durationMs: true },
      take: 5000,
    }),
    prisma.observabilityEvent.groupBy({
      by: ["traceId"],
      where: { storeId, createdAt: { gte: t1 }, traceId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 15,
    }),
  ]);

  const durations = authRows
    .map((r) => r.durationMs)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    storeId,
    since24h: t24.toISOString(),
    since1h: t1.toISOString(),
    summary24h: {
      errors,
      warns,
      timeouts: timeoutsCount,
      slowSafeQueries: slowSafeCount,
      prismaSlow: prismaSlowCount,
      prismaFailures: prismaFailCount,
      authSamples: durations.length,
      authAvgMs: durations.length ? Math.round(sum / durations.length) : null,
      authP50Ms: percentile(durations, 50),
      authP95Ms: percentile(durations, 95),
    },
    groupedErrors: groupedErrorsRaw.map((g) => ({
      message: g.message,
      queryKey: g.queryKey,
      path: g.path,
      count: g._count.id,
    })),
    slowSafeQueries: slowSafeRaw.map((g) => ({
      queryKey: g.queryKey,
      path: g.path,
      count: g._count.id,
      maxMs: g._max.durationMs ?? 0,
      avgMs: Math.round(g._avg.durationMs ?? 0),
    })),
    prismaSlow: prismaSlowRaw.map((g) => ({
      queryKey: g.queryKey,
      count: g._count.id,
      maxMs: g._max.durationMs ?? 0,
      avgMs: Math.round(g._avg.durationMs ?? 0),
    })),
    prismaFailures: prismaFailGrouped.map((g) => ({
      queryKey: g.queryKey,
      count: g._count.id,
    })),
    topFailingRoutes: failingRoutesRaw
      .filter((g) => g.path != null)
      .map((g) => ({ path: g.path as string, count: g._count.id })),
    timeouts: timeoutsGrouped.map((g) => ({
      queryKey: g.queryKey,
      path: g.path,
      count: g._count.id,
    })),
    recentTraces: traceRows
      .filter((r) => r.traceId != null)
      .map((r) => ({ traceId: r.traceId as string, events: r._count.id })),
  };
}
