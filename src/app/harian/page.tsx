import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { DailyTracker } from "@/components/daily-tracker";
import { todayWIB } from "@/lib/date";
import { getDailyLogs, getProfile } from "@/lib/db/queries";

async function DailyLoader() {
  let logs;
  let profileData;

  try {
    [logs, profileData] = await Promise.all([getDailyLogs(), getProfile()]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  return (
    <DailyTracker
      todayDateWIB={todayWIB()}
      logs={logs}
      stepTarget={profileData?.stepTarget ?? 8000}
    />
  );
}

function DailySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-44 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function DailyPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pelacak Harian</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat jumlah langkah, durasi tidur, dan skor energi harian Anda.
          </p>
        </div>

        <Suspense fallback={<DailySkeleton />}>
          <DailyLoader />
        </Suspense>
      </div>
    </AppShell>
  );
}
