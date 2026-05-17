import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth/cached-session";
import { assertAdmin } from "@/lib/auth/scope";
import { isAuthDebugLogsEnabled } from "@/lib/auth/cookie-constants";

export async function requireAdminSession() {
  const session = await getCachedSession();
  try {
    const admin = assertAdmin(session);
    if (isAuthDebugLogsEnabled()) {
      console.log(
        JSON.stringify({
          scope: "auth",
          message: "admin_session_ok",
          userId: admin.userId,
          role: admin.role,
          storeId: admin.storeId,
        }),
      );
    }
    return admin;
  } catch {
    if (isAuthDebugLogsEnabled()) {
      console.warn(
        JSON.stringify({
          scope: "auth",
          message: "admin_session_redirect_login",
          hasSession: !!session,
          role: session?.role ?? null,
          storeId: session?.storeId ?? null,
        }),
      );
    }
    redirect("/login-admin");
  }
}
