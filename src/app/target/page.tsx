import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { TargetCalculator } from "@/components/target-calculator";
import { resolveSafeCalorieTarget } from "@/lib/calc";
import { todayWIB } from "@/lib/date";
import { getProfile, getWeightLogs } from "@/lib/db/queries";

async function TargetLoader() {
  let profileData;
  let weightLogs;

  try {
    [profileData, weightLogs] = await Promise.all([
      getProfile(),
      getWeightLogs(),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  const today = todayWIB();
  const referenceWeight =
    weightLogs[0]?.weightKg ?? profileData?.startWeightKg ?? null;

  const safeProfile =
    profileData && referenceWeight !== null
      ? {
          ...profileData,
          calorieTarget: resolveSafeCalorieTarget({
            storedCalorieTarget: profileData.calorieTarget,
            weightKg: referenceWeight,
            heightCm: profileData.heightCm,
            birthDate: profileData.birthDate,
            sex: profileData.sex,
            referenceDate: today,
          }).effectiveCalorieTarget,
        }
      : profileData;

  return (
    <TargetCalculator
      profile={safeProfile}
      referenceWeightKg={referenceWeight}
      todayDateWIB={today}
    />
  );
}

function TargetSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-44 animate-pulse rounded-xl border border-border bg-card" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}

export default function TargetPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Kalkulator Target Kalori
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hitung BMR, TDEE, saran target kalori harian, dan estimasi waktu
            mencapai target.
          </p>
        </div>

        <Suspense fallback={<TargetSkeleton />}>
          <TargetLoader />
        </Suspense>
      </div>
    </AppShell>
  );
}
