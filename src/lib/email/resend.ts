import "server-only";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendResendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "HAGOR <orders@hagor.co.il>";
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err || res.statusText };
  }
  return { ok: true };
}
