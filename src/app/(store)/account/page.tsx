import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getStoreId } from "@/lib/store-config";

export const dynamic = "force-dynamic";

export default async function AccountHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const storeId = getStoreId();
  const user = await prisma.user.findFirst({
    where: { id: session.userId, storeId },
    include: { customerProfile: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">האזור האישי</h1>
      <p className="mt-2 text-zinc-600">שלום {user?.name}</p>
      {user?.customerProfile && (
        <p className="mt-4 text-zinc-700">
          נקודות נאמנות:{" "}
          <span className="font-semibold">{user.customerProfile.pointsBalance}</span>
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/account/orders"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
        >
          ההזמנות שלי
        </Link>
        <Link
          href="/account/loyalty"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
        >
          מימוש פרסים
        </Link>
      </div>
    </div>
  );
}
