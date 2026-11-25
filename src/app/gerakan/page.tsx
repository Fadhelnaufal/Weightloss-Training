import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ExerciseLibrary } from "@/components/exercise-library";
import { getExercises } from "@/lib/db/queries";

async function ExerciseLibraryLoader() {
  let exercises;
  try {
    exercises = await getExercises();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  return <ExerciseLibrary exercises={exercises} />;
}

function ExerciseLibrarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}

export default function ExercisesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Library Gerakan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pelajari form, filter versi low-impact, dan lihat rantai progresi
            tiap gerakan.
          </p>
        </div>

        <Suspense fallback={<ExerciseLibrarySkeleton />}>
          <ExerciseLibraryLoader />
        </Suspense>
      </div>
    </AppShell>
  );
}
