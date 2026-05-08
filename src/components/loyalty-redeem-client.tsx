"use client";

import Link from "next/link";
import { useState } from "react";

export function LoyaltyRedeemClient({
  rewardId,
  requiredPoints,
  balance,
  needsTerms,
  disabled = false,
}: {
  rewardId: string;
  requiredPoints: number;
  balance: number;
  needsTerms: boolean;
  /** e.g. unverified email — full club features locked */
  disabled?: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptClubTerms, setAcceptClubTerms] = useState(false);
  const can = balance >= requiredPoints;
  const termsOk = !needsTerms || acceptClubTerms;

  async function redeem() {
    setLoading(true);
    setMsg(null);
    try {
      const body: { rewardId: string; acceptTerms?: boolean } = { rewardId };
      if (needsTerms) body.acceptTerms = true;
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMsg(data.message ?? data.error ?? "");
      if (res.ok) window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 space-y-2">
      {needsTerms && !disabled && (
        <label className="flex max-w-xs items-start gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={acceptClubTerms}
            onChange={(e) => setAcceptClubTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            מאשר/ת את{" "}
            <Link href="/terms" className="text-blue-400 hover:underline">
              התקנון
            </Link>{" "}
            ואת{" "}
            <Link href="/privacy" className="text-blue-400 hover:underline">
              מדיניות הפרטיות
            </Link>{" "}
            של מועדון הנאמנות.
          </span>
        </label>
      )}
      <button
        type="button"
        disabled={disabled || !can || loading || !termsOk}
        onClick={redeem}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "…" : disabled ? "נדרש אימות אימייל" : "מימוש"}
      </button>
      {disabled && <p className="mt-1 text-xs text-amber-200/90">אמתו את האימייל כדי לממש פרסים.</p>}
      {!can && !disabled && (
        <p className="mt-1 text-xs text-slate-500">אין מספיק נקודות</p>
      )}
      {msg && <p className="mt-1 text-xs text-slate-300">{msg}</p>}
    </div>
  );
}
