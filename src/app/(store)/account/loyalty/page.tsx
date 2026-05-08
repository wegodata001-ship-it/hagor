import { LoyaltyRedeemClient } from "@/components/loyalty-redeem-client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { STORE_ID } from "@/lib/store";
import { pickLocalized } from "@/lib/localized";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const storeId = STORE_ID;

  const [profile, rewards, termsUser] = await Promise.all([
    prisma.customerProfile.findFirst({
      where: { userId: session.userId, storeId },
    }),
    prisma.loyaltyReward.findMany({
      where: { storeId, active: true },
      orderBy: { requiredPoints: "asc" },
    }),
    prisma.user.findFirst({
      where: { id: session.userId, storeId },
      select: { acceptedTermsAt: true, emailVerified: true },
    }),
  ]);

  const locale = "he" as const;
  const needsTerms = !termsUser?.acceptedTermsAt;
  const needsEmail = !termsUser?.emailVerified;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-50">מועדון לקוחות</h1>
      <p className="mt-2 text-slate-400">
        יתרת נקודות:{" "}
        <span className="font-semibold text-slate-100">{profile?.pointsBalance ?? 0}</span>
      </p>
      {needsEmail && (
        <div className="mt-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          לאחר אימות האימייל ייפתח מימוש מלא של פרסי המועדון.
        </div>
      )}
      <h2 className="mt-8 text-lg font-semibold text-slate-100">פרסים זמינים</h2>
      <ul className="mt-4 space-y-4">
        {rewards.map((r) => (
          <li
            key={r.id}
            className="ds-card-glass flex flex-col gap-2 border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium text-slate-100">{pickLocalized(r, "title", locale)}</div>
              <div className="text-sm text-slate-400">{pickLocalized(r, "description", locale)}</div>
              <div className="mt-1 text-sm text-slate-500">
                נדרשות {r.requiredPoints} נקודות · {r.rewardType}
              </div>
            </div>
            <LoyaltyRedeemClient
              rewardId={r.id}
              requiredPoints={r.requiredPoints}
              balance={profile?.pointsBalance ?? 0}
              needsTerms={needsTerms}
              disabled={needsEmail}
            />
          </li>
        ))}
      </ul>
      {rewards.length === 0 && <p className="mt-4 text-slate-500">אין פרסים כרגע.</p>}
    </div>
  );
}
