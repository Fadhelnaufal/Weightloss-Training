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
import { formatDateID, shiftDateString } from "@/lib/date";
import type { FrequentMealPreset, MealLogItem } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

interface MealTrackerProps {
  todayDateWIB: string;
  allMeals: ReadonlyArray<MealLogItem>;
  frequentPresets: ReadonlyArray<FrequentMealPreset>;
  calorieTarget: number | null;
  proteinTargetG: number | null;
}

const MEAL_TYPE_ORDER: Array<MealLogItem["mealType"]> = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

const MEAL_TYPE_LABELS: Record<MealLogItem["mealType"], string> = {
  breakfast: "Sarapan",
  lunch: "Makan Siang",
  dinner: "Makan Malam",
  snack: "Camilan",
};

export function MealTracker({
  todayDateWIB,
  allMeals,
  frequentPresets,
  calorieTarget,
  proteinTargetG,
}: MealTrackerProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(todayDateWIB);
  const [mealType, setMealType] = useState<MealLogItem["mealType"]>("breakfast");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMealType, setEditMealType] =
    useState<MealLogItem["mealType"]>("breakfast");
  const [editDescription, setEditDescription] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editProteinG, setEditProteinG] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedDayMeals = useMemo(
    () => allMeals.filter((m) => m.logDate === selectedDate),
    [allMeals, selectedDate],
  );

  const totalCalories = useMemo(
    () => selectedDayMeals.reduce((sum, item) => sum + item.calories, 0),
    [selectedDayMeals],
  );

  const totalProtein = useMemo(
    () =>
      Math.round(
        selectedDayMeals.reduce((sum, item) => sum + (item.proteinG ?? 0), 0) *
          10,
      ) / 10,
    [selectedDayMeals],
  );

  const mealsByType = useMemo(() => {
    const map = new Map<MealLogItem["mealType"], MealLogItem[]>();
    for (const type of MEAL_TYPE_ORDER) {
      map.set(type, []);
    }
    for (const meal of selectedDayMeals) {
      map.get(meal.mealType)?.push(meal);
    }
    return map;
  }, [selectedDayMeals]);

  const dateSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      { logDate: string; calories: number; proteinG: number; count: number }
    >();
    for (const meal of allMeals) {
      const curr = grouped.get(meal.logDate) ?? {
        logDate: meal.logDate,
        calories: 0,
        proteinG: 0,
        count: 0,
      };
      curr.calories += meal.calories;
      curr.proteinG =
        Math.round((curr.proteinG + (meal.proteinG ?? 0)) * 10) / 10;
      curr.count += 1;
      grouped.set(meal.logDate, curr);
    }
    return Array.from(grouped.values()).sort((a, b) =>
      b.logDate.localeCompare(a.logDate),
    );
  }, [allMeals]);

  async function addMealPayload(payload: {
    logDate: string;
    mealType: MealLogItem["mealType"];
    description: string;
    calories: number | string;
    proteinG: number | string | null;
  }) {
    setError(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Gagal mencatat makanan.");
        return false;
      }

      setFeedback("Catatan makanan berhasil ditambahkan.");
      router.refresh();
      return true;
    } catch {
      setError("Gagal terhubung ke server.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await addMealPayload({
      logDate: selectedDate,
      mealType,
      description,
      calories,
      proteinG,
    });
    if (ok) {
      setDescription("");
      setCalories("");
      setProteinG("");
    }
  }

  function startEdit(item: MealLogItem) {
    setError(null);
    setConfirmDeleteId(null);
    setEditingId(item.id);
    setEditMealType(item.mealType);
    setEditDescription(item.description);
    setEditCalories(String(item.calories));
    setEditProteinG(item.proteinG !== null ? String(item.proteinG) : "");
  }

  async function saveEdit(id: number) {
    setError(null);
    setBusyId(id);

    try {
      const response = await fetch(`/api/meals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logDate: selectedDate,
          mealType: editMealType,
          description: editDescription,
          calories: editCalories,
          proteinG: editProteinG,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal memperbarui catatan makanan.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMeal(id: number) {
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/meals/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError("Gagal menghapus catatan makanan.");
        return;
      }
      setConfirmDeleteId(null);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusyId(null);
    }
  }

  const progressRatio =
    calorieTarget && calorieTarget > 0
      ? Math.min(100, Math.round((totalCalories / calorieTarget) * 100))
      : 0;
  const remainingCalories =
    calorieTarget !== null ? calorieTarget - totalCalories : null;

  return (
    <div className="space-y-6">
      {/* Pilih Tanggal & Ringkasan Harian */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ringkasan Asupan ({formatDateID(selectedDate)})
            </CardDescription>
            <CardTitle className="mt-1 text-3xl font-bold tabular-nums">
              {totalCalories.toLocaleString("id-ID")} kkal
              {calorieTarget !== null && (
                <span className="text-lg font-normal text-muted-foreground">
                  {" "}
                  / {calorieTarget.toLocaleString("id-ID")} kkal
                </span>
              )}
            </CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={selectedDate === todayDateWIB ? "default" : "outline"}
              onClick={() => setSelectedDate(todayDateWIB)}
              className="min-h-11 px-3.5 text-xs font-medium"
            >
              Hari Ini
            </Button>
            <Button
              type="button"
              variant={
                selectedDate === shiftDateString(todayDateWIB, -1)
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setSelectedDate(shiftDateString(todayDateWIB, -1))
              }
              className="min-h-11 px-3.5 text-xs font-medium"
            >
              Kemarin
            </Button>
            <Input
              type="date"
              aria-label="Pilih tanggal makanan"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="min-h-11 w-auto tabular-nums"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {calorieTarget !== null ? (
            <>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all",
                    remainingCalories !== null && remainingCalories < 0
                      ? "bg-destructive"
                      : "bg-primary",
                  )}
                  style={{ width: `${progressRatio}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground tabular-nums">
                <span>
                  {remainingCalories !== null && remainingCalories >= 0
                    ? `Sisa kuota: ${remainingCalories.toLocaleString("id-ID")} kkal`
                    : `Melebihi target: ${Math.abs(remainingCalories ?? 0).toLocaleString("id-ID")} kkal`}
                </span>
                <span>
                  Protein: {totalProtein} g
                  {proteinTargetG !== null ? ` / ${proteinTargetG} g` : ""}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span className="tabular-nums">Total protein: {totalProtein} g</span>
              <Link
                href="/target"
                className="font-medium text-primary underline underline-offset-4"
              >
                Atur target kalori di Kalkulator Target
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pilihan Cepat dari Riwayat (tanpa tabel baru) */}
      {frequentPresets.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">
              Pilihan Cepat dari Riwayat
            </CardTitle>
            <CardDescription>
              Entri yang sering Anda catat. Ketuk untuk langsung menambahkan ke{" "}
              {formatDateID(selectedDate)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {frequentPresets.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() =>
                  addMealPayload({
                    logDate: selectedDate,
                    mealType: preset.mealType,
                    description: preset.description,
                    calories: preset.calories,
                    proteinG: preset.proteinG,
                  })
                }
                className="min-h-11 h-auto px-3 py-2 text-left text-xs"
              >
                <span>
                  <strong className="font-semibold text-foreground">
                    + {preset.description}
                  </strong>
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {MEAL_TYPE_LABELS[preset.mealType]} | {preset.calories} kkal
                    {preset.proteinG !== null ? ` | ${preset.proteinG}g P` : ""}
                  </span>
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Form Input Cepat */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Catat Makanan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="mealType">Waktu Makan</Label>
                <select
                  id="mealType"
                  value={mealType}
                  onChange={(e) =>
                    setMealType(e.target.value as MealLogItem["mealType"])
                  }
                  className="flex min-h-12 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {MEAL_TYPE_ORDER.map((type) => (
                    <option key={type} value={type}>
                      {MEAL_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="mealDescription">Deskripsi Makanan</Label>
                <Input
                  id="mealDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Nasi 150g + dada ayam panggang + sayur"
                  maxLength={200}
                  className="min-h-12 text-base"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mealCalories">Kalori (kkal)</Label>
                <Input
                  id="mealCalories"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={5000}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="Contoh: 450"
                  className="min-h-12 text-base font-semibold tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mealProtein">Protein (gram, opsional)</Label>
                <Input
                  id="mealProtein"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={0}
                  max={500}
                  value={proteinG}
                  onChange={(e) => setProteinG(e.target.value)}
                  placeholder="Contoh: 32"
                  className="min-h-12 text-base tabular-nums"
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
              disabled={submitting}
              className="min-h-12 w-full text-base font-semibold sm:w-auto sm:px-8"
            >
              {submitting ? "Menyimpan..." : "Simpan Makanan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Daftar Makanan Tanggal Terpilih */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Daftar Makanan ({formatDateID(selectedDate)})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedDayMeals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              Belum ada makanan dicatat untuk tanggal ini.
            </p>
          ) : (
            MEAL_TYPE_ORDER.map((type) => {
              const items = mealsByType.get(type) ?? [];
              if (items.length === 0) return null;
              const subtotalCal = items.reduce((s, i) => s + i.calories, 0);

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      {MEAL_TYPE_LABELS[type]}
                    </h3>
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      {subtotalCal.toLocaleString("id-ID")} kkal
                    </span>
                  </div>

                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {items.map((item) => {
                      const isEditing = editingId === item.id;
                      const isConfirming = confirmDeleteId === item.id;
                      const isBusy = busyId === item.id;

                      return (
                        <li key={item.id} className="p-3">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                                <select
                                  value={editMealType}
                                  onChange={(e) =>
                                    setEditMealType(
                                      e.target.value as MealLogItem["mealType"],
                                    )
                                  }
                                  className="flex min-h-11 rounded-lg border border-input bg-background px-2.5 text-sm"
                                >
                                  {MEAL_TYPE_ORDER.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {MEAL_TYPE_LABELS[opt]}
                                    </option>
                                  ))}
                                </select>
                                <Input
                                  value={editDescription}
                                  onChange={(e) =>
                                    setEditDescription(e.target.value)
                                  }
                                  className="min-h-11 sm:col-span-3"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={5000}
                                  value={editCalories}
                                  onChange={(e) =>
                                    setEditCalories(e.target.value)
                                  }
                                  placeholder="Kalori"
                                  className="min-h-11 tabular-nums"
                                />
                                <Input
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  max={500}
                                  value={editProteinG}
                                  onChange={(e) =>
                                    setEditProteinG(e.target.value)
                                  }
                                  placeholder="Protein (g)"
                                  className="min-h-11 tabular-nums"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={() => saveEdit(item.id)}
                                  disabled={isBusy}
                                  className="min-h-11 px-4"
                                >
                                  {isBusy ? "Menyimpan..." : "Simpan"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                  disabled={isBusy}
                                  className="min-h-11 px-4"
                                >
                                  Batal
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">
                                  {item.description}
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  {item.calories.toLocaleString("id-ID")} kkal
                                  {item.proteinG !== null
                                    ? ` | Protein ${item.proteinG} g`
                                    : ""}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {isConfirming ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      onClick={() => deleteMeal(item.id)}
                                      disabled={isBusy}
                                      className="min-h-11 px-3 text-xs"
                                    >
                                      {isBusy ? "Menghapus..." : "Konfirmasi"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setConfirmDeleteId(null)}
                                      disabled={isBusy}
                                      className="min-h-11 px-3 text-xs"
                                    >
                                      Batal
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => startEdit(item)}
                                      className="min-h-11 px-3 text-xs"
                                    >
                                      Ubah
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      onClick={() =>
                                        setConfirmDeleteId(item.id)
                                      }
                                      className="min-h-11 px-3 text-xs"
                                    >
                                      Hapus
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Ringkasan Riwayat Per Tanggal */}
      {dateSummaries.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Riwayat Kalori Per Tanggal
            </CardTitle>
            <CardDescription>
              Ketuk tanggal untuk melihat atau mengedit entri makanan di hari
              tersebut.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border rounded-lg border border-border p-0">
            {dateSummaries.slice(0, 14).map((summary) => (
              <button
                key={summary.logDate}
                type="button"
                onClick={() => setSelectedDate(summary.logDate)}
                className={cn(
                  "flex min-h-12 w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring",
                  summary.logDate === selectedDate && "bg-accent/40 font-semibold",
                )}
              >
                <span className="tabular-nums">
                  {formatDateID(summary.logDate)} ({summary.count} entri)
                </span>
                <span className="tabular-nums text-foreground">
                  {summary.calories.toLocaleString("id-ID")} kkal
                  {summary.proteinG > 0 ? ` | ${summary.proteinG}g P` : ""}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
