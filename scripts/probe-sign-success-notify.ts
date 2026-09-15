/**
 * Safe SIGN-only probe. No charge. No secrets printed.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
function loadEnvFile(file: string) {
  const path = join(root, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

async function sign(extra: Record<string, string>) {
  const apiKey = process.env.HYP_API_KEY!.trim();
  const passP = process.env.HYP_PASSP!.trim();
  const masof = process.env.HYP_MASOF!.trim();
  const base = (process.env.HYP_BASE_URL?.trim() || "https://pay.hyp.co.il/p/").replace(/\/?$/, "/");
  const orderId = `audit-sign-${Date.now()}`;
  const p = new URLSearchParams();
  p.set("action", "APISign");
  p.set("What", "SIGN");
  p.set("Sign", "True");
  p.set("MoreData", "True");
  p.set("UTF8", "True");
  p.set("UTF8out", "True");
  p.set("Coin", "1");
  p.set("PageLang", "HEB");
  p.set("Masof", masof);
  p.set("KEY", apiKey);
  p.set("PassP", passP);
  p.set("Amount", "3");
  p.set("Order", orderId);
  p.set("Info", "HAGOUR SIGN AUDIT");
  p.set("ClientName", "Audit");
  p.set("ClientLName", "Test");
  p.set("email", "audit@example.com");
  p.set("UserId", "000000000");
  p.set("SuccessUrl", "https://hagourbywael.com/api/payments/hyp/return");
  p.set("ErrorUrl", `https://hagourbywael.com/payment/failed?orderId=${encodeURIComponent(orderId)}`);
  p.set("CancelUrl", `https://hagourbywael.com/payment/failed?orderId=${encodeURIComponent(orderId)}`);
  p.set("Fild1", "hagor");
  p.set("Fild2", "SIGN-AUDIT");
  p.set("Fild3", orderId);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);

  const res = await fetch(`${base}?${p.toString()}`, { cache: "no-store" });
  const raw = (await res.text()).trim();
  const map = Object.fromEntries(new URLSearchParams(raw));
  const keys = [...raw.matchAll(/([^=&]+)=/g)]
    .map((m) => m[1])
    .filter((k) => !/^(KEY|PassP|Passp|signature)$/i.test(k));

  return {
    orderId,
    orderNumber: "SIGN-AUDIT",
    amount: 3,
    createdAt: new Date().toISOString(),
    http: res.status,
    hasSignature: /signature=/i.test(raw),
    actionPay: /action=pay/i.test(raw),
    sentSuccessUrl: "https://hagourbywael.com/api/payments/hyp/return",
    echoedSuccessUrl: map.SuccessUrl || map.successUrl || null,
    echoedErrorUrl: map.ErrorUrl || map.errorUrl || null,
    echoedCancelUrl: map.CancelUrl || map.cancelUrl || null,
    echoedNotifyUrl: map.NotifyUrl || map.notifyUrl || map.NotifyURL || map.IPN || map.CallbackUrl || null,
    successUrlIsProduction: (map.SuccessUrl || map.successUrl || "").startsWith(
      "https://hagourbywael.com/api/payments/hyp/return",
    ),
    hasLocalhostOrPreview: /(localhost|127\.0\.0\.1|vercel\.app)/i.test(raw),
    responseKeys: keys,
    extraSent: Object.keys(extra),
  };
}

async function main() {
  const baseline = await sign({});
  console.log("SIGN_BASELINE", JSON.stringify(baseline, null, 2));

  const notifyVariants: Record<string, string>[] = [
    { NotifyUrl: "https://hagourbywael.com/api/webhooks/payment/hyp" },
    { notifyUrl: "https://hagourbywael.com/api/webhooks/payment/hyp" },
    { NotifyURL: "https://hagourbywael.com/api/webhooks/payment/hyp" },
    { CallbackUrl: "https://hagourbywael.com/api/webhooks/payment/hyp" },
    { IPN: "https://hagourbywael.com/api/webhooks/payment/hyp" },
    { ServerUrl: "https://hagourbywael.com/api/webhooks/payment/hyp" },
  ];

  for (const extra of notifyVariants) {
    const r = await sign(extra);
    console.log(
      "SIGN_NOTIFY_PROBE",
      JSON.stringify(
        {
          extraSent: r.extraSent,
          echoedNotifyUrl: r.echoedNotifyUrl,
          responseHasNotifyKey: r.responseKeys.some((k) => /notify|ipn|callback|serverurl/i.test(k)),
          hasSignature: r.hasSignature,
          actionPay: r.actionPay,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
