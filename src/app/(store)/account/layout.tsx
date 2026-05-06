import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== UserRole.CUSTOMER) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <aside className="hidden w-48 shrink-0 md:block">
        <nav className="space-y-2 text-sm">
          <Link href="/account" className="block text-blue-600 hover:underline">
            סקירה
          </Link>
          <Link href="/account/orders" className="block text-blue-600 hover:underline">
            ההזמנות שלי
          </Link>
          <Link href="/account/loyalty" className="block text-blue-600 hover:underline">
            מועדון לקוחות
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
