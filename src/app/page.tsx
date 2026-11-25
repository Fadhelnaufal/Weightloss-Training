import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { InAppReminders } from "@/components/in-app-reminders";
import { ProgressionSuggestions } from "@/components/progression-suggestions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveSafeCalorieTarget } from "@/lib/calc";
import {
  calculate7DayMovingAverage,
  calculateTargetDifference,
} from "@/lib/calc/weight";
import {
  formatDateID,
  getIsoWeekday,
  todayWIB,
  WEEKDAY_NAMES_ID,
} from "@/lib/date";
import {
  getProfile,
  getTodayDailyAndMealSummary,
  getWeightLogs,
  getWorkoutOverview,
} from "@/lib/db/queries";

async function DashboardContent() {
  let profileData;
  let logs;

  try {
    [profileData, logs] = await Promise.all([getProfile(), getWeightLogs()]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  const today = todayWIB();
  const [workoutOverview, dailyMealSummary] = await Promise.all([
    getWorkoutOverview(today),
    getTodayDailyAndMealSummary(today),
  ]);

  const latestLog = logs[0] ?? null;
  const todayLog = logs.find((item) => item.logDate === today) ?? null;

  const movingAvg7d = calculate7DayMovingAverage(
    logs.map((item) => ({ logDate: item.logDate, weightKg: item.weightKg })),
    today,
  );

  const targetDiff = calculateTargetDifference(
    latestLog ? latestLog.weightKg : null,
    profileData ? profileData.targetWeightKg : null,
  );

  const { todayPlan, completedToday, activeSession, streakDays, suggestions } =
    workoutOverview;

  const isRestOrPaused =
    !todayPlan ||
    todayPlan.dayType === "rest" ||
    todayPlan.dayType === "active_rest" ||
    !todayPlan.isActive ||
    todayPlan.items.length === 0;

  const stepTarget = profileData?.stepTarget ?? 8000;
  const safeCalorie = profileData
    ? resolveSafeCalorieTarget({
        storedCalorieTarget: profileData.calorieTarget,
        weightKg: latestLog?.weightKg ?? profileData.startWeightKg,
        heightCm: profileData.heightCm,
        birthDate: profileData.birthDate,
        sex: profileData.sex,
        referenceDate: today,
      })
    : null;
  const calorieTarget = safeCalorie?.effectiveCalorieTarget ?? null;

  return (
    <div className="space-y-6">
      <InAppReminders
        hasWeightToday={todayLog !== null}
        isSunday={getIsoWeekday(today) === 7}
        hasScheduledWorkoutToday={!isRestOrPaused}
        todayWorkoutTitle={todayPlan?.title ?? null}
        workoutCompletedToday={completedToday}
        hasActiveSession={activeSession !== null}
      />

      {/* Metrik Berat & Aksi Cepat Timbang */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Berat Terkini
          </CardDescription>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-4xl font-bold tracking-tight tabular-nums">
                {latestLog
                  ? `${latestLog.weightKg.toFixed(1)} kg`
                  : "Belum ada data"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {latestLog
                  ? latestLog.logDate === today
                    ? "Dicatat hari ini (WIB)"
                    : `Terakhir dicatat ${formatDateID(latestLog.logDate)}`
                  : "Mulai catat berat badan harian Anda sekarang."}
              </p>
            </div>

            <Link
              href="/berat#catat"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {todayLog ? "Perbarui Berat Hari Ini" : "Catat Berat Hari Ini"}
            </Link>
          </div>
        </CardHeader>
      </Card>

      {/* Ringkasan Target & Rata-rata 7 Hari */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Selisih ke Target
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {targetDiff === null
                ? "Belum tersedia"
                : targetDiff.status === "reached"
                  ? "Target tercapai"
                  : targetDiff.status === "above"
                    ? `${targetDiff.diffKg.toFixed(1)} kg lagi`
                    : `${Math.abs(targetDiff.diffKg).toFixed(1)} kg di bawah target`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {profileData ? (
              <span>
                Target Anda:{" "}
                <strong className="font-semibold text-foreground tabular-nums">
                  {profileData.targetWeightKg.toFixed(1)} kg
                </strong>
                {profileData.targetDate
                  ? ` pada ${formatDateID(profileData.targetDate)}`
                  : ""}
              </span>
            ) : (
              <Link
                href="/profil"
                className="font-medium text-primary underline underline-offset-4"
              >
                Lengkapi target berat di Profil
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rata-rata 7 Hari
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {movingAvg7d !== null
                ? `${movingAvg7d.toFixed(2)} kg`
                : "Data belum cukup"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {movingAvg7d !== null
              ? "Rata-rata bergerak 7 hari kalender terakhir."
              : "Butuh minimal 3 entri dalam 7 hari terakhir untuk menilai tren."}
          </CardContent>
        </Card>
      </div>

      {/* Kalori Hari Ini vs Target & Langkah Hari Ini vs Target */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kalori Hari Ini
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {dailyMealSummary.totalCalories.toLocaleString("id-ID")} kkal
              {calorieTarget !== null && (
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {calorieTarget.toLocaleString("id-ID")} kkal
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {calorieTarget === null ? (
                <Link
                  href="/target"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Hitung target kalori
                </Link>
              ) : dailyMealSummary.totalCalories <= calorieTarget ? (
                `Sisa ${(calorieTarget - dailyMealSummary.totalCalories).toLocaleString("id-ID")} kkal`
              ) : (
                `Lebih ${(dailyMealSummary.totalCalories - calorieTarget).toLocaleString("id-ID")} kkal`
              )}
            </span>
            <Link
              href="/makanan"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Catat Makanan
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Langkah Hari Ini
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {dailyMealSummary.steps !== null
                ? `${dailyMealSummary.steps.toLocaleString("id-ID")}`
                : "0"}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {stepTarget.toLocaleString("id-ID")} langkah
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {dailyMealSummary.sleepHours !== null
                ? `Tidur ${dailyMealSummary.sleepHours} jam`
                : "Belum ada catatan harian"}
              {dailyMealSummary.energyScore !== null
                ? ` | Energi ${dailyMealSummary.energyScore}/5`
                : ""}
            </span>
            <Link
              href="/harian"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Catat Harian
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Latihan Hari Ini & Streak Latihan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card sm:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Latihan Hari Ini (
              {todayPlan ? WEEKDAY_NAMES_ID[todayPlan.weekday] : "Hari Ini"})
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {activeSession
                ? `Sedang Berjalan: ${activeSession.title}`
                : todayPlan
                  ? todayPlan.title
                  : "Jadwal belum di-seed"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {activeSession
                ? "Ada sesi latihan yang belum diselesaikan."
                : completedToday
                  ? "Latihan hari ini sudah selesai dicatat."
                  : isRestOrPaused
                    ? todayPlan?.note ||
                      "Hari istirahat sesuai jadwal. Anda tetap bisa memulai sesi bebas."
                    : `${todayPlan.items.length} gerakan siap dikerjakan.`}
            </p>
            <Link
              href="/workout/hari-ini"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {activeSession
                ? "Lanjutkan Sesi"
                : completedToday || isRestOrPaused
                  ? "Buka Mode Workout"
                  : "Mulai Workout"}
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Streak Latihan
            </CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {streakDays} hari
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Hari istirahat terjadwal tidak memutus streak Anda.
          </CardContent>
        </Card>
      </div>

      {/* Kartu Saran Progresi (jika ada) */}
      <ProgressionSuggestions suggestions={suggestions} />

      {!profileData && (
        <Card className="border-border bg-muted/50">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              Profil awal belum diisi. Lengkapi profil agar target berat dan
              kalori dapat dipantau.
            </p>
            <Link
              href="/profil"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Buka Profil
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-xl border border-border bg-card" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ringkasan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau berat badan, kalori, aktivitas, dan latihan harian Anda.
          </p>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
