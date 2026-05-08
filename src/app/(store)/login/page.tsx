import { Suspense } from "react";
import { LoginPageClient } from "./login-page-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-400">טוען…</div>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
