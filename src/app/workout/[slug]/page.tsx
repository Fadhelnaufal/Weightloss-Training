import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WorkoutPlayer } from "@/components/workout-player";
import { getIsoWeekday, todayWIB } from "@/lib/date";
import {
  getActiveWorkoutSession,
  getExercises,
  getPlanDaysWithItems,
} from "@/lib/db/queries";

async function WorkoutLoader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let activeSession;
  let allPlanDays;
  let exercises;

  try {
    [activeSession, allPlanDays, exercises] = await Promise.all([
      getActiveWorkoutSession(),
      getPlanDaysWithItems(),
      getExercises(),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  const today = todayWIB();
  const parsedWeekday = Number(slug);
  const targetWeekday =
    Number.isInteger(parsedWeekday) &&
    parsedWeekday >= 1 &&
    parsedWeekday <= 7
      ? parsedWeekday
      : getIsoWeekday(today);

  const targetPlanDay =
    allPlanDays.find((day) => day.weekday === targetWeekday) ?? null;

  return (
    <WorkoutPlayer
      todayDateWIB={today}
      targetPlanDay={targetPlanDay}
      allPlanDays={allPlanDays}
      exercises={exercises}
      initialActiveSession={activeSession}
    />
  );
}

function WorkoutSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function WorkoutPage(props: PageProps<"/workout/[slug]">) {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mode Workout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat reps atau durasi per set. Progres tersimpan otomatis setiap
            set.
          </p>
        </div>

        <Suspense fallback={<WorkoutSkeleton />}>
          <WorkoutLoader params={props.params} />
        </Suspense>
      </div>
    </AppShell>
  );
}
