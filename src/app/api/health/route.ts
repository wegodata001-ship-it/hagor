import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthEnvError } from "@/lib/auth/env-check";
import { STORE_ID } from "@/lib/store";

export const runtime = "nodejs";

/** Public health check — helps diagnose production deploy issues (no secrets exposed). */
export async function GET() {
  const envError = getAuthEnvError();
  const checks: Record<string, "ok" | "fail" | "missing"> = {
    sessionSecret: process.env.SESSION_SECRET?.trim() && process.env.SESSION_SECRET.length >= 16 ? "ok" : "missing",
    databaseUrl: process.env.DATABASE_URL?.trim() ? "ok" : "missing",
    jwtSecret: process.env.JWT_SECRET?.trim() ? "ok" : "missing",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "ok" : "missing",
    storeId: STORE_ID ? "ok" : "missing",
  };

  let database: "ok" | "fail" = "fail";
  if (!envError) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch (e) {
      console.error("health: database ping failed", e);
      database = "fail";
    }
  }

  const ok =
    !envError &&
    database === "ok" &&
    Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      ok,
      storeId: STORE_ID,
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      checks: { ...checks, database },
      hint: ok
        ? null
        : "העתיקו את כל משתני הסביבה מ-.env ל-Vercel → Settings → Environment Variables, ואז Deploy מחדש.",
    },
    { status: ok ? 200 : 503 },
  );
}
