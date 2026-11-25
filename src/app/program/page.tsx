import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ProgramManager } from "@/components/program-manager";
import { ProgressionSuggestions } from "@/components/progression-suggestions";
import {
  getExercises,
  getPlanDaysWithItems,
  getProgressionSuggestions,
} from "@/lib/db/queries";

async function ProgramContent() {
  let days;
  let exercises;
  let suggestions;

  try {
    [days, exercises, suggestions] = await Promise.all([
      getPlanDaysWithItems(),
      getExercises(),
      getProgressionSuggestions(),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <ProgressionSuggestions suggestions={suggestions} />
      <ProgramManager days={days} exercises={exercises} />
    </div>
  );
}

function ProgramSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-52 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-52 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function ProgramPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Program Mingguan
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Jadwal latihan bodyweight Senin sampai Minggu yang bisa Anda
              sesuaikan.
            </p>
          </div>
          <Link
            href="/gerakan"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Library Gerakan
          </Link>
        </div>

        <Suspense fallback={<ProgramSkeleton />}>
          <ProgramContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
