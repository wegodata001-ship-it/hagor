import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertAdmin } from "@/lib/auth/scope";

export async function requireAdminSession() {
  const session = await getSession();
  try {
    return assertAdmin(session);
  } catch {
    redirect("/login-admin");
  }
}
