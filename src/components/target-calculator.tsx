"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateCaloriePlan, MEDICAL_DISCLAIMER } from "@/lib/calc";
import { formatDateID } from "@/lib/date";
import type { ProfileData } from "@/lib/db/queries";

interface TargetCalculatorProps {
  profile: ProfileData | null;
  referenceWeightKg: number | null;
  todayDateWIB: string;
}

const WEEKLY_GOAL_PRESETS = [0.25, 0.5, 0.75, 1.0];

export function TargetCalculator({
  profile,
  referenceWeightKg,
  todayDateWIB,
}: TargetCalculatorProps) {
  const router = useRouter();
  const [weeklyLossGoal, setWeeklyLossGoal] = useState(
    profile ? String(profile.weeklyLossGoalKg) : "0.5",
  );
  const [manualCalories, setManualCalories] = useState(
    profile?.calorieTarget ? String(profile.calorieTarget) : "",
  );
  const [proteinTargetG, setProteinTargetG] = useState(
    profile?.proteinTargetG ? String(profile.proteinTargetG) : "",
  );
  const [stepTarget, setStepTarget] = useState(
    profile ? String(profile.stepTarget) : "8000",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const parsedGoal = useMemo(() => {
    const val = Number(weeklyLossGoal);
    return Number.isFinite(val) && val > 0 ? val : 0.5;
  }, [weeklyLossGoal]);

  const calculation = useMemo(() => {
    if (!profile || referenceWeightKg === null) return null;
    return calculateCaloriePlan({
      weightKg: referenceWeightKg,
      heightCm: profile.heightCm,
      birthDate: profile.birthDate,
      sex: profile.sex,
      activityLevel: profile.activityLevel,
      targetWeightKg: profile.targetWeightKg,
      weeklyLossGoalKg: parsedGoal,
      referenceDate: todayDateWIB,
    });
  }, [profile, referenceWeightKg, parsedGoal, todayDateWIB]);

  if (!profile || referenceWeightKg === null || !calculation) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Profil Belum Lengkap
          </CardTitle>
          <CardDescription>
            Lengkapi tinggi badan, tanggal lahir, jenis kelamin, level
            aktivitas, dan target berat di Pengaturan Profil untuk menghitung
            BMR dan TDEE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href="/profil"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Lengkapi Profil
          </Link>
          <p className="text-xs text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
        </CardContent>
      </Card>
    );
  }

  async function saveTargetValues(calorieValue: number) {
    setError(null);
    setFeedback(null);
    setSaving(true);

    try {
      const response = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyLossGoalKg: parsedGoal,
          calorieTarget: calorieValue,
          proteinTargetG,
          stepTarget,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menyimpan target.");
        return;
      }

      setManualCalories(String(calorieValue));
      setFeedback(
        `Target kalori (${calorieValue} kkal/hari) dan target langkah berhasil disimpan ke profil.`,
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numeric = Number(manualCalories);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError("Masukkan angka target kalori yang valid.");
      return;
    }
    saveTargetValues(Math.round(numeric));
  }

  return (
    <div className="space-y-6">
      {/* Input Laju Penurunan */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Simulasi Laju Penurunan
          </CardTitle>
          <CardDescription>
            Menggunakan berat referensi{" "}
            <strong className="font-semibold text-foreground tabular-nums">
              {referenceWeightKg.toFixed(1)} kg
            </strong>
            , tinggi {profile.heightCm} cm, usia {calculation.ageYears} tahun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weeklyLossGoal">
              Target Penurunan Mingguan (kg/minggu)
            </Label>
            <div className="flex flex-wrap gap-2">
              {WEEKLY_GOAL_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={parsedGoal === preset ? "default" : "outline"}
                  onClick={() => setWeeklyLossGoal(String(preset))}
                  className="min-h-11 px-4 text-sm tabular-nums"
                >
                  {preset} kg/mgg
                </Button>
              ))}
            </div>
            <Input
              id="weeklyLossGoal"
              type="number"
              inputMode="decimal"
              step="0.05"
              min="0.1"
              max="2.0"
              value={weeklyLossGoal}
              onChange={(e) => setWeeklyLossGoal(e.target.value)}
              className="mt-2 min-h-12 max-w-xs text-base tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Saran laju default: 0,25 sampai 0,75 kg/minggu (1 kg lemak setara
              sekitar 7.700 kkal).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Peringatan Laju > 1 kg/minggu atau Clamp BMR */}
      {calculation.rateWarning && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive"
        >
          {calculation.rateWarning}
        </div>
      )}

      {calculation.bmrFloorNotice && (
        <div
          role="status"
          className="rounded-xl border border-primary/40 bg-accent p-4 text-sm font-medium text-accent-foreground"
        >
          {calculation.bmrFloorNotice}
        </div>
      )}

      {/* Hasil Perhitungan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide">
              BMR (Batas Bawah)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {calculation.bmr} kkal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Energi dasar tubuh (Mifflin-St Jeor). Target tidak boleh di bawah
            nilai ini.
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide">
              TDEE (Pemeliharaan)
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {calculation.tdee} kkal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Perkiraan kebutuhan kalori harian sesuai level aktivitas Anda.
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">
              Saran Target Kalori
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-primary tabular-nums">
              {calculation.recommendedCalories} kkal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Defisit efektif {calculation.effectiveDailyDeficit} kkal/hari (~
            {calculation.effectiveWeeklyLossKg} kg/minggu).
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide">
              Estimasi Capai Target
            </CardDescription>
            <CardTitle className="text-xl font-bold tabular-nums">
              {calculation.estimatedTargetDate
                ? formatDateID(calculation.estimatedTargetDate)
                : "Belum tersedia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {calculation.estimatedWeeks === 0
              ? `Target ${profile.targetWeightKg.toFixed(1)} kg sudah tercapai.`
              : calculation.estimatedWeeks !== null
                ? `Sekitar ${calculation.estimatedWeeks} minggu menuju ${profile.targetWeightKg.toFixed(1)} kg.`
                : "Defisit efektif 0 kkal/hari."}
          </CardContent>
        </Card>
      </div>

      {/* Simpan Saran / Override Manual */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Simpan Target Harian
          </CardTitle>
          <CardDescription>
            Target tersimpan saat ini:{" "}
            <strong className="text-foreground tabular-nums">
              {profile.calorieTarget
                ? `${profile.calorieTarget} kkal/hari`
                : "Belum disimpan"}
            </strong>
            {" | "}Target langkah:{" "}
            <strong className="text-foreground tabular-nums">
              {profile.stepTarget.toLocaleString("id-ID")} langkah
            </strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => saveTargetValues(calculation.recommendedCalories)}
              disabled={saving}
              className="min-h-12 px-6 text-base font-semibold"
            >
              {saving
                ? "Menyimpan..."
                : `Pakai sebagai target (${calculation.recommendedCalories} kkal)`}
            </Button>
          </div>

          <form
            onSubmit={handleManualSubmit}
            className="space-y-4 border-t border-border pt-4"
          >
            <p className="text-sm font-semibold text-foreground">
              Override Manual & Target Harian Tambahan
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="manualCalories">
                  Target Kalori Manual (kkal)
                </Label>
                <Input
                  id="manualCalories"
                  type="number"
                  inputMode="numeric"
                  min={calculation.bmr}
                  max={6000}
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  placeholder={String(calculation.recommendedCalories)}
                  className="min-h-12 text-base tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proteinTargetG">
                  Target Protein (gram, opsional)
                </Label>
                <Input
                  id="proteinTargetG"
                  type="number"
                  inputMode="numeric"
                  min={20}
                  max={400}
                  value={proteinTargetG}
                  onChange={(e) => setProteinTargetG(e.target.value)}
                  placeholder="Misal: 110"
                  className="min-h-12 text-base tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stepTarget">Target Langkah Harian</Label>
                <Input
                  id="stepTarget"
                  type="number"
                  inputMode="numeric"
                  min={1000}
                  max={50000}
                  value={stepTarget}
                  onChange={(e) => setStepTarget(e.target.value)}
                  className="min-h-12 text-base tabular-nums"
                  required
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}

            {feedback && (
              <p
                role="status"
                className="rounded-lg border border-primary/30 bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground"
              >
                {feedback}
              </p>
            )}

            <Button
              type="submit"
              variant="outline"
              disabled={saving}
              className="min-h-11 px-5 text-sm font-semibold"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan Manual"}
            </Button>
          </form>

          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            {calculation.disclaimer}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
