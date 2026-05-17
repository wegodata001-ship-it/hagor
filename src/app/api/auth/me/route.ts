import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { runtimeLog } from "@/lib/runtime-log/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const started = Date.now();
  const storeId = STORE_ID;
  const path = new URL(request.url).pathname;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findFirst({
      where: { id: session.userId, storeId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        acceptedTermsAt: true,
        customerProfile: {
          select: { id: true, pointsBalance: true },
        },
      },
    });

    const durationMs = Date.now() - started;
    if (durationMs > 800 || process.env.NODE_ENV === "development") {
      runtimeLog({
        level: durationMs > 1500 ? "warn" : "info",
        scope: "api",
        message: "auth.me",
        durationMs,
        path,
      });
    }

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        acceptedTermsAt: user.acceptedTermsAt?.toISOString() ?? null,
        pointsBalance: user.customerProfile?.pointsBalance ?? null,
        customerProfileId: user.customerProfile?.id ?? null,
      },
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    runtimeLog({
      level: "error",
      scope: "api",
      message: "auth.me_failed",
      durationMs: Date.now() - started,
      path,
      error: err.message,
    });
    return NextResponse.json({ user: null });
  }
}
