import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";
import { getAppUrl } from "@/lib/app-url";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import { strongPasswordRegex } from "@/lib/password-strength";

export const runtime = "nodejs";

const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;

const Schema = z.object({
  name: z.string().trim().min(1, "יש להזין שם מלא"),
  email: z
    .string()
    .trim()
    .min(1, "יש להזין אימייל")
    .email("יש להזין אימייל תקין"),
  confirmEmail: z.string().trim().min(1, "יש להזין אימייל לאימות"),
  phone: z.string().trim().min(1, "יש להזין מספר טלפון תקין").refine((v) => phoneRegex.test(v), {
    message: "יש להזין מספר טלפון תקין",
  }),
  password: z
    .string()
    .min(1, "יש להזין סיסמה")
    .refine((v) => strongPasswordRegex.test(v), {
      message:
        "הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה, מספר ותו מיוחד",
    }),
  confirmPassword: z.string().min(1, "יש לאמת סיסמה"),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "יש לאשר את תנאי השימוש",
  }),
}).superRefine((data, ctx) => {
  if (data.email.toLowerCase() !== data.confirmEmail.toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmEmail"],
      message: "האימיילים אינם תואמים",
    });
  }
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "הסיסמאות אינן תואמות",
    });
  }
});

export async function POST(req: Request) {
  const storeId = STORE_ID;
  const ip = clientIpFromRequest(req);
  if (!rateLimit(`register:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "יותר מדי ניסיונות הרשמה. נסו שוב בעוד דקה." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid registration" },
      { status: 400 },
    );
  }

  const settings = await prisma.storeSettings.findUnique({ where: { storeId } });
  if (settings && !settings.registrationEnabled) {
    return NextResponse.json({ error: "ההרשמה סגורה כרגע. צרו קשר עם התמיכה." }, { status: 403 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findFirst({
    where: { storeId, email: normalizedEmail },
  });
  if (exists) {
    return NextResponse.json({ error: "האימייל כבר רשום במערכת" }, { status: 409 });
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        storeId,
        name: parsed.data.name,
        email: normalizedEmail,
        password: hash,
        acceptedTermsAt: new Date(),
        role: UserRole.CUSTOMER,
        emailVerified: false,
        customerProfile: {
          create: {
            storeId,
            phone: parsed.data.phone,
            pointsBalance: 0,
          },
        },
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        storeId,
        userId: createdUser.id,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    return createdUser;
  });

  const verification = await prisma.emailVerificationToken.findFirst({
    where: {
      storeId,
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { token: true },
  });

  const appUrl = getAppUrl();
  const verifyUrl = verification
    ? `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(verification.token)}`
    : null;

  return NextResponse.json({
    ok: true,
    userId: user.id,
    requiresEmailVerification: true,
    verifyUrl,
  });
}
