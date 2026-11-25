import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WorkoutHistoryView } from "@/components/workout-history-view";
import {
  buildExerciseProgressSummaries,
  getFinishedWorkoutSessions,
} from "@/lib/db/queries";

async function HistoryLoader() {
  let sessions;
  try {
    sessions = await getFinishedWorkoutSessions();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  const summaries = buildExerciseProgressSummaries(sessions);
  return (
    <WorkoutHistoryView sessions={sessions} progressSummaries={summaries} />
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Workout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tinjau sesi latihan yang sudah selesai dan perkembangan tiap
            gerakan.
          </p>
        </div>

        <Suspense fallback={<HistorySkeleton />}>
          <HistoryLoader />
        </Suspense>
      </div>
    </AppShell>
  );
}
