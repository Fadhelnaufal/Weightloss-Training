"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAY_NAMES_ID } from "@/lib/date";
import type { ExerciseItem, PlanDayWithItems } from "@/lib/db/queries";

interface EditablePlanItem {
  localKey: string;
  exerciseId: number;
  targetSets: number;
  targetReps: string;
  targetSeconds: string;
  restSeconds: number;
  note: string;
}

interface ProgramManagerProps {
  days: ReadonlyArray<PlanDayWithItems>;
  exercises: ReadonlyArray<ExerciseItem>;
}

const DAY_TYPE_LABELS: Record<PlanDayWithItems["dayType"], string> = {
  strength: "Kekuatan",
  cardio: "Kardio",
  circuit: "Circuit",
  rest: "Istirahat",
  active_rest: "Istirahat Aktif",
};

export function ProgramManager({ days, exercises }: ProgramManagerProps) {
  const router = useRouter();
  const [editingWeekday, setEditingWeekday] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDayType, setEditDayType] =
    useState<PlanDayWithItems["dayType"]>("strength");
  const [editNote, setEditNote] = useState("");
  const [editItems, setEditItems] = useState<EditablePlanItem[]>([]);
  const [togglingCardio, setTogglingCardio] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const cardioDays = days.filter((d) => d.dayType === "cardio");
  const cardioEnabled =
    cardioDays.length > 0 && cardioDays.every((d) => d.isActive);

  const exerciseById = new Map(exercises.map((ex) => [ex.id, ex]));

  function startEditing(day: PlanDayWithItems) {
    setError(null);
    setFeedback(null);
    setEditingWeekday(day.weekday);
    setEditTitle(day.title);
    setEditDayType(day.dayType);
    setEditNote(day.note ?? "");
    setEditItems(
      day.items.map((item, idx) => ({
        localKey: `${item.id}-${idx}`,
        exerciseId: item.exerciseId,
        targetSets: item.targetSets,
        targetReps: item.targetReps !== null ? String(item.targetReps) : "",
        targetSeconds:
          item.targetSeconds !== null ? String(item.targetSeconds) : "",
        restSeconds: item.restSeconds,
        note: item.note ?? "",
      })),
    );
  }

  function handleExerciseChange(index: number, newExerciseId: number) {
    const selected = exerciseById.get(newExerciseId);
    setEditItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (!selected) return { ...item, exerciseId: newExerciseId };
        return {
          ...item,
          exerciseId: newExerciseId,
          targetReps:
            selected.trackingType === "reps" ? item.targetReps || "10" : "",
          targetSeconds:
            selected.trackingType === "time" ? item.targetSeconds || "30" : "",
        };
      }),
    );
  }

  function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= editItems.length) return;
    setEditItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function addItem() {
    const defaultExercise = exercises[0];
    if (!defaultExercise) return;
    setEditItems((prev) => [
      ...prev,
      {
        localKey: `new-${Date.now()}-${prev.length}`,
        exerciseId: defaultExercise.id,
        targetSets: 3,
        targetReps: defaultExercise.trackingType === "reps" ? "10" : "",
        targetSeconds: defaultExercise.trackingType === "time" ? "30" : "",
        restSeconds: 45,
        note: "",
      },
    ]);
  }

  async function handleSaveDay(weekday: number) {
    setError(null);
    setFeedback(null);
    setSavingDay(true);

    try {
      const response = await fetch(`/api/program/${weekday}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          dayType: editDayType,
          note: editNote,
          items: editItems.map((item) => {
            const ex = exerciseById.get(item.exerciseId);
            return {
              exerciseId: item.exerciseId,
              targetSets: item.targetSets,
              targetReps:
                ex?.trackingType === "reps" ? item.targetReps || "10" : null,
              targetSeconds:
                ex?.trackingType === "time" ? item.targetSeconds || "30" : null,
              restSeconds: item.restSeconds,
              note: item.note,
            };
          }),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menyimpan perubahan hari.");
        return;
      }

      setEditingWeekday(null);
      setFeedback(
        `Jadwal hari ${WEEKDAY_NAMES_ID[weekday]} berhasil diperbarui.`,
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSavingDay(false);
    }
  }

  async function handleToggleCardio() {
    setError(null);
    setFeedback(null);
    setTogglingCardio(true);

    const nextEnabled = !cardioEnabled;
    try {
      const response = await fetch("/api/program/cardio-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal mengubah status hari kardio.");
        return;
      }

      setFeedback(
        nextEnabled
          ? "Hari kardio (Selasa & Sabtu) diaktifkan."
          : "Hari kardio (Selasa & Sabtu) dijeda untuk fokus 3 hari inti.",
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setTogglingCardio(false);
    }
  }

  if (days.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Belum ada data jadwal program. Jalankan <code>npm run db:seed</code>{" "}
          untuk mengisi template gerakan dan jadwal mingguan.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Mode Pemula: Hari Kardio (Selasa & Sabtu)
            </p>
            <p className="text-xs text-muted-foreground">
              Pemula disarankan memulai 3 hari inti (Senin, Rabu, Jumat), lalu
              mengaktifkan hari kardio setelah minggu ke-2.
            </p>
          </div>
          <Button
            type="button"
            variant={cardioEnabled ? "default" : "outline"}
            onClick={handleToggleCardio}
            disabled={togglingCardio || cardioDays.length === 0}
            aria-pressed={cardioEnabled}
            className="min-h-11 shrink-0 px-4 text-sm font-semibold"
          >
            {togglingCardio
              ? "Mengubah..."
              : cardioEnabled
                ? "Hari Kardio: Aktif"
                : "Hari Kardio: Dijeda"}
          </Button>
        </CardContent>
      </Card>

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

      <div className="space-y-4">
        {days.map((day) => {
          const isEditing = editingWeekday === day.weekday;
          const isPausedCardio = day.dayType === "cardio" && !day.isActive;

          return (
            <Card
              key={day.id}
              className={
                isPausedCardio
                  ? "border-border bg-muted/40 opacity-85"
                  : "border-border bg-card"
              }
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-primary">
                        {WEEKDAY_NAMES_ID[day.weekday]}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {DAY_TYPE_LABELS[day.dayType]}
                      </span>
                      {isPausedCardio && (
                        <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          Dijeda
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-1 text-lg font-bold">
                      {day.title}
                    </CardTitle>
                    {day.note && !isEditing && (
                      <CardDescription className="mt-1 text-sm">
                        {day.note}
                      </CardDescription>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex flex-wrap gap-2">
                      {day.items.length > 0 && !isPausedCardio && (
                        <Link
                          href={`/workout/${day.weekday}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          Mulai Latihan
                        </Link>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => startEditing(day)}
                        className="min-h-11 px-4 text-sm"
                      >
                        Edit Hari
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`day-title-${day.weekday}`}>
                          Judul Hari
                        </Label>
                        <Input
                          id={`day-title-${day.weekday}`}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="min-h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`day-type-${day.weekday}`}>
                          Jenis Hari
                        </Label>
                        <select
                          id={`day-type-${day.weekday}`}
                          value={editDayType}
                          onChange={(e) =>
                            setEditDayType(
                              e.target.value as PlanDayWithItems["dayType"],
                            )
                          }
                          className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <option value="strength">Kekuatan</option>
                          <option value="cardio">Kardio</option>
                          <option value="circuit">Circuit</option>
                          <option value="active_rest">Istirahat Aktif</option>
                          <option value="rest">Istirahat</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`day-note-${day.weekday}`}>
                        Catatan Hari
                      </Label>
                      <Textarea
                        id={`day-note-${day.weekday}`}
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Daftar Gerakan</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addItem}
                          className="min-h-11 px-3 text-xs font-semibold"
                        >
                          + Tambah Gerakan
                        </Button>
                      </div>

                      {editItems.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                          Belum ada gerakan untuk hari ini.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {editItems.map((item, idx) => {
                            const ex = exerciseById.get(item.exerciseId);
                            const isTime = ex?.trackingType === "time";

                            return (
                              <div
                                key={item.localKey}
                                className="space-y-3 rounded-lg border border-border bg-muted/30 p-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-muted-foreground">
                                    Gerakan #{idx + 1}
                                  </span>
                                  <div className="flex gap-1.5">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => moveItem(idx, -1)}
                                      disabled={idx === 0}
                                      className="min-h-11 px-2.5 text-xs"
                                    >
                                      Naik
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => moveItem(idx, 1)}
                                      disabled={idx === editItems.length - 1}
                                      className="min-h-11 px-2.5 text-xs"
                                    >
                                      Turun
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      onClick={() =>
                                        setEditItems((prev) =>
                                          prev.filter((_, i) => i !== idx),
                                        )
                                      }
                                      className="min-h-11 px-2.5 text-xs"
                                    >
                                      Hapus
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                                  <div className="space-y-1 sm:col-span-2">
                                    <Label htmlFor={`ex-${item.localKey}`}>
                                      Gerakan
                                    </Label>
                                    <select
                                      id={`ex-${item.localKey}`}
                                      value={item.exerciseId}
                                      onChange={(e) =>
                                        handleExerciseChange(
                                          idx,
                                          Number(e.target.value),
                                        )
                                      }
                                      className="flex min-h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                    >
                                      {exercises.map((option) => (
                                        <option
                                          key={option.id}
                                          value={option.id}
                                        >
                                          {option.name} (Lv{" "}
                                          {option.difficultyLevel})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <Label htmlFor={`sets-${item.localKey}`}>
                                      Set
                                    </Label>
                                    <Input
                                      id={`sets-${item.localKey}`}
                                      type="number"
                                      min={1}
                                      max={12}
                                      value={item.targetSets}
                                      onChange={(e) =>
                                        setEditItems((prev) =>
                                          prev.map((row, i) =>
                                            i === idx
                                              ? {
                                                  ...row,
                                                  targetSets: Number(
                                                    e.target.value,
                                                  ),
                                                }
                                              : row,
                                          ),
                                        )
                                      }
                                      className="min-h-11 tabular-nums"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label htmlFor={`target-${item.localKey}`}>
                                      {isTime ? "Target (dtk)" : "Target Reps"}
                                    </Label>
                                    <Input
                                      id={`target-${item.localKey}`}
                                      type="number"
                                      min={isTime ? 5 : 1}
                                      max={isTime ? 600 : 200}
                                      value={
                                        isTime
                                          ? item.targetSeconds
                                          : item.targetReps
                                      }
                                      onChange={(e) =>
                                        setEditItems((prev) =>
                                          prev.map((row, i) =>
                                            i === idx
                                              ? isTime
                                                ? {
                                                    ...row,
                                                    targetSeconds:
                                                      e.target.value,
                                                  }
                                                : {
                                                    ...row,
                                                    targetReps: e.target.value,
                                                  }
                                              : row,
                                          ),
                                        )
                                      }
                                      className="min-h-11 tabular-nums"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                  <div className="space-y-1">
                                    <Label htmlFor={`rest-${item.localKey}`}>
                                      Istirahat (dtk)
                                    </Label>
                                    <Input
                                      id={`rest-${item.localKey}`}
                                      type="number"
                                      min={0}
                                      max={300}
                                      value={item.restSeconds}
                                      onChange={(e) =>
                                        setEditItems((prev) =>
                                          prev.map((row, i) =>
                                            i === idx
                                              ? {
                                                  ...row,
                                                  restSeconds: Number(
                                                    e.target.value,
                                                  ),
                                                }
                                              : row,
                                          ),
                                        )
                                      }
                                      className="min-h-11 tabular-nums"
                                    />
                                  </div>
                                  <div className="space-y-1 sm:col-span-2">
                                    <Label htmlFor={`note-${item.localKey}`}>
                                      Catatan Gerakan (opsional)
                                    </Label>
                                    <Input
                                      id={`note-${item.localKey}`}
                                      value={item.note}
                                      onChange={(e) =>
                                        setEditItems((prev) =>
                                          prev.map((row, i) =>
                                            i === idx
                                              ? { ...row, note: e.target.value }
                                              : row,
                                          ),
                                        )
                                      }
                                      placeholder="Misal: per sisi"
                                      className="min-h-11"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={() => handleSaveDay(day.weekday)}
                        disabled={savingDay}
                        className="min-h-11 px-5 font-semibold"
                      >
                        {savingDay ? "Menyimpan..." : "Simpan Hari"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingWeekday(null)}
                        disabled={savingDay}
                        className="min-h-11 px-4"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : day.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada gerakan terjadwal pada hari ini.
                  </p>
                ) : (
                  <ol className="divide-y divide-border rounded-lg border border-border">
                    {day.items.map((item, idx) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {idx + 1}. {item.exercise.name}
                          </span>
                          {item.note && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({item.note})
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground tabular-nums">
                          {item.targetSets} set x{" "}
                          {item.exercise.trackingType === "reps"
                            ? `${item.targetReps ?? 0} reps`
                            : `${item.targetSeconds ?? 0} dtk`}{" "}
                          (istirahat {item.restSeconds} dtk)
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
