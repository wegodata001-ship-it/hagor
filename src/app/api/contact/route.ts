import { NextResponse } from "next/server";
import { z } from "zod";
import {
  queueEmail,
  sendContactAutoReplyEmail,
  sendContactLeadEmail,
} from "@/lib/email/email-service";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().trim().min(1, "שם חובה"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("אימייל לא תקין").optional().or(z.literal("")),
  message: z.string().trim().min(3, "הודעה קצרה מדי"),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "נתונים לא תקינים";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { name, phone, email, message } = parsed.data;
  const emailNorm = email?.trim() || null;

  queueEmail(async () => {
    await sendContactLeadEmail({
      name,
      phone: phone || null,
      email: emailNorm,
      message,
    });
    if (emailNorm) {
      await sendContactAutoReplyEmail({ name, email: emailNorm });
    }
  });

  return NextResponse.json({ ok: true });
}
