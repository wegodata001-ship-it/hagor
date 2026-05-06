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
      select: { acceptedTermsAt: true },
    }),
  ]);

  const locale = "he" as const;
  const needsTerms = !termsUser?.acceptedTermsAt;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">מועדון לקוחות</h1>
      <p className="mt-2 text-zinc-700">
        יתרת נקודות:{" "}
        <span className="font-semibold">{profile?.pointsBalance ?? 0}</span>
      </p>
      <h2 className="mt-8 text-lg font-semibold text-zinc-900">פרסים זמינים</h2>
      <ul className="mt-4 space-y-4">
        {rewards.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium text-zinc-900">{pickLocalized(r, "title", locale)}</div>
              <div className="text-sm text-zinc-600">{pickLocalized(r, "description", locale)}</div>
              <div className="mt-1 text-sm text-zinc-500">
                נדרשות {r.requiredPoints} נקודות · {r.rewardType}
              </div>
            </div>
            <LoyaltyRedeemClient
              rewardId={r.id}
              requiredPoints={r.requiredPoints}
              balance={profile?.pointsBalance ?? 0}
              needsTerms={needsTerms}
            />
          </li>
        ))}
      </ul>
      {rewards.length === 0 && <p className="mt-4 text-zinc-600">אין פרסים כרגע.</p>}
    </div>
  );
}
