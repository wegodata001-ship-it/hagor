import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { applySessionCookieToResponse, signSession } from "@/lib/auth/session";
import { isAuthDebugLogsEnabled, SESSION_COOKIE_NAME } from "@/lib/auth/cookie-constants";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: Request) {
  const storeId = STORE_ID;
  const ip = clientIpFromRequest(req);
  if (!rateLimit(`login:${ip}`, 25, 60_000)) {
    return NextResponse.json({ error: "יותר מדי ניסיונות. נסו שוב בעוד דקה." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נא למלא אימייל וסיסמה תקינים." }, { status: 400 });
  }

  let user:
    | {
        id: string;
        storeId: string | null;
        role: "CUSTOMER" | "STORE_OWNER" | "SUPER_ADMIN";
        password: string;
        emailVerified: boolean;
      }
    | null = null;
  try {
    user = await prisma.user.findFirst({
      where: { storeId, email: parsed.data.email.toLowerCase() },
      select: {
        id: true,
        storeId: true,
        role: true,
        password: true,
        emailVerified: true,
      },
    });
  } catch (e) {
    // This shows up in Vercel runtime logs and helps diagnose DATABASE_URL / Prisma issues.
    console.error("login: prisma error", e);
    return NextResponse.json({ error: "שגיאת שרת. נסו שוב מאוחר יותר." }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "אימייל או סיסמה שגויים." }, { status: 401 });
  }

  let ok = false;
  try {
    ok = await bcrypt.compare(parsed.data.password, user.password);
  } catch (e) {
    console.error("login: bcrypt compare error", e);
    return NextResponse.json({ error: "שגיאת שרת. נסו שוב מאוחר יותר." }, { status: 500 });
  }
  if (!ok) {
    return NextResponse.json({ error: "אימייל או סיסמה שגויים." }, { status: 401 });
  }

  try {
    const remember = parsed.data.rememberMe === true;
    const maxAgeSec = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const expiresIn = remember ? "30d" : "7d";
    const token = await signSession(
      {
        userId: user.id,
        role: user.role,
        storeId: user.storeId,
      },
      { expiresIn },
    );
    const res = NextResponse.json({ ok: true, role: user.role });
    applySessionCookieToResponse(res, token, { maxAgeSec });
    if (isAuthDebugLogsEnabled()) {
      const setCookie = res.headers.get("set-cookie");
      console.log(
        JSON.stringify({
          scope: "auth",
          message: "login_success_cookie_attached",
          userId: user.id,
          role: user.role,
          cookieName: SESSION_COOKIE_NAME,
          hasSetCookieHeader: !!setCookie,
          setCookiePreview: setCookie ? setCookie.split(";").slice(0, 5).join(";") : null,
        }),
      );
    }
    return res;
  } catch (e) {
    console.error("login: session cookie error", e);
    return NextResponse.json({ error: "המערכת לא מוגדרת כראוי. צרו קשר עם התמיכה." }, { status: 500 });
  }
}
