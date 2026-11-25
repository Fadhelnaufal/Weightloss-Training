import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { MealTracker } from "@/components/meal-tracker";
import { resolveSafeCalorieTarget } from "@/lib/calc";
import { todayWIB } from "@/lib/date";
import {
  computeFrequentMealPresets,
  getMealLogs,
  getProfile,
  getWeightLogs,
} from "@/lib/db/queries";

async function MealPageLoader() {
  let profileData;
  let allMeals;
  let weights;

  try {
    [profileData, allMeals, weights] = await Promise.all([
      getProfile(),
      getMealLogs(),
      getWeightLogs(),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  const today = todayWIB();
  const frequentPresets = computeFrequentMealPresets(allMeals, 8);
  const safeCalorie = profileData
    ? resolveSafeCalorieTarget({
        storedCalorieTarget: profileData.calorieTarget,
        weightKg: weights[0]?.weightKg ?? profileData.startWeightKg,
        heightCm: profileData.heightCm,
        birthDate: profileData.birthDate,
        sex: profileData.sex,
        referenceDate: today,
      })
    : null;

  return (
    <MealTracker
      todayDateWIB={today}
      allMeals={allMeals}
      frequentPresets={frequentPresets}
      calorieTarget={safeCalorie?.effectiveCalorieTarget ?? null}
      proteinTargetG={profileData?.proteinTargetG ?? null}
    />
  );
}

function MealPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

export default function MealsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Makanan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat kalori dan protein harian secara sederhana per waktu makan.
          </p>
        </div>

        <Suspense fallback={<MealPageSkeleton />}>
          <MealPageLoader />
        </Suspense>
      </div>
    </AppShell>
  );
}
