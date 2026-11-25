import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WeightChart } from "@/components/weight-chart";
import { WeightForm } from "@/components/weight-form";
import { WeightHistory } from "@/components/weight-history";
import { todayWIB } from "@/lib/date";
import { getWeightLogs } from "@/lib/db/queries";

async function WeightPageContent() {
  let logs;
  try {
    logs = await getWeightLogs();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  const todayDateWIB = todayWIB();

  return (
    <div className="space-y-6">
      <WeightForm defaultDateWIB={todayDateWIB} existingLogs={logs} />
      <WeightChart logs={logs} todayDateWIB={todayDateWIB} />
      <WeightHistory logs={logs} />
    </div>
  );
}

function WeightPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-80 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function WeightPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Berat Badan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat berat harian, pantau grafik tren, dan kelola riwayat.
          </p>
        </div>

        <Suspense fallback={<WeightPageSkeleton />}>
          <WeightPageContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
