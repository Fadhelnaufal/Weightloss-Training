import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
      <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-lg bg-muted" />
      <div className="mt-4 h-12 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
