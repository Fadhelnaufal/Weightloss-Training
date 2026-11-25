"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { formatDateID, WEEKDAY_NAMES_ID } from "@/lib/date";
import type {
  ExerciseItem,
  PlanDayWithItems,
  WorkoutSessionDetail,
  WorkoutSetItem,
} from "@/lib/db/queries";
import { cn } from "@/lib/utils";

interface WorkoutPlayerProps {
  todayDateWIB: string;
  targetPlanDay: PlanDayWithItems | null;
  allPlanDays: ReadonlyArray<PlanDayWithItems>;
  exercises: ReadonlyArray<ExerciseItem>;
  initialActiveSession: WorkoutSessionDetail | null;
}

interface FreeBuilderItem {
  exerciseId: number;
  sets: number;
}

interface SetDraftState {
  reps: string;
  seconds: string;
  rpe: string;
  isCompleted: boolean;
}

const LOW_IMPACT_SWAP_SLUGS: Record<string, string> = {
  burpee: "burpee-no-jump",
  "jumping-jack": "step-jack",
  "high-knees": "march-in-place",
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function playShortBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1046, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Abaikan jika browser memblokir Web Audio
  }
}

function triggerTimerCue() {
  playShortBeep();
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([220, 100, 220]);
    }
  } catch {
    // Abaikan jika Vibration API tidak didukung
  }
}

export function WorkoutPlayer({
  todayDateWIB,
  targetPlanDay,
  allPlanDays,
  exercises,
  initialActiveSession,
}: WorkoutPlayerProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [selectedPlanDayId, setSelectedPlanDayId] = useState<number | null>(
    targetPlanDay?.id ?? allPlanDays.find((d) => d.items.length > 0)?.id ?? null,
  );
  const [freeTitle, setFreeTitle] = useState("Sesi Bebas");
  const [freeItems, setFreeItems] = useState<FreeBuilderItem>(() => ({
    exerciseId: exercises[0]?.id ?? 0,
    sets: 3,
  }));
  const [freeList, setFreeList] = useState<FreeBuilderItem[]>([]);

  // Active session states (menyimpan perubahan lokal di atas data server)
  const [setDrafts, setSetDrafts] = useState<Record<number, SetDraftState>>({});
  const [savingSetId, setSavingSetId] = useState<number | null>(null);
  const [openCuesId, setOpenCuesId] = useState<number | null>(null);
  const [swappingExerciseId, setSwappingExerciseId] = useState<number | null>(
    null,
  );

  // Timer states
  const [timerMode, setTimerMode] = useState<"rest" | "work">("rest");
  const [timerDuration, setTimerDuration] = useState(45);
  const [timerRemaining, setTimerRemaining] = useState(45);
  const [timerRunning, setTimerRunning] = useState(false);

  // Wake Lock status
  const [wakeLockState, setWakeLockState] = useState<
    "idle" | "active" | "unsupported"
  >("idle");
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Finish & cancel states
  const [showFinishPanel, setShowFinishPanel] = useState(false);
  const [overallRpe, setOverallRpe] = useState<number>(7);
  const [sessionNote, setSessionNote] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    durationSeconds: number;
    overallRpe: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wake Lock API saat sesi aktif berjalan
  useEffect(() => {
    if (!initialActiveSession) {
      return;
    }

    let cancelled = false;
    const navWithLock = navigator as Navigator & {
      wakeLock?: {
        request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
      };
    };

    async function acquireLock() {
      if (!navWithLock.wakeLock) {
        if (!cancelled) setWakeLockState("unsupported");
        return;
      }
      try {
        const sentinel = await navWithLock.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
        setWakeLockState("active");
      } catch {
        if (!cancelled) setWakeLockState("unsupported");
      }
    }

    acquireLock();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        acquireLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [initialActiveSession]);

  // Timer interval
  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerRunning(false);
          triggerTimerCue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  const startCountdown = useCallback(
    (mode: "rest" | "work", seconds: number) => {
      const safeSeconds = Math.max(5, seconds);
      setTimerMode(mode);
      setTimerDuration(safeSeconds);
      setTimerRemaining(safeSeconds);
      setTimerRunning(true);
    },
    [],
  );

  const exerciseGroups = useMemo(() => {
    if (!initialActiveSession) return [];
    const groups: Array<{
      exercise: ExerciseItem;
      sets: WorkoutSetItem[];
      restSeconds: number;
    }> = [];
    const indexByExerciseId = new Map<number, number>();

    for (const s of initialActiveSession.sets) {
      const existingIndex = indexByExerciseId.get(s.exerciseId);
      if (existingIndex === undefined) {
        indexByExerciseId.set(s.exerciseId, groups.length);
        groups.push({
          exercise: s.exercise,
          sets: [s],
          restSeconds:
            initialActiveSession.restByExerciseId[s.exerciseId] ?? 45,
        });
      } else {
        groups[existingIndex].sets.push(s);
      }
    }
    return groups;
  }, [initialActiveSession]);

  const exerciseById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises],
  );
  const exerciseBySlug = useMemo(
    () => new Map(exercises.map((e) => [e.slug, e])),
    [exercises],
  );

  async function handleStartPlanSession() {
    if (!selectedPlanDayId) return;
    setError(null);
    setStarting(true);

    try {
      const response = await fetch("/api/workout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "plan",
          planDayId: selectedPlanDayId,
          sessionDate: todayDateWIB,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal memulai sesi latihan.");
        return;
      }
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setStarting(false);
    }
  }

  async function handleStartFreeSession() {
    if (freeList.length === 0) {
      setError("Tambahkan minimal 1 gerakan ke daftar sesi bebas.");
      return;
    }
    setError(null);
    setStarting(true);

    try {
      const response = await fetch("/api/workout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "free",
          title: freeTitle.trim() || "Sesi Bebas",
          sessionDate: todayDateWIB,
          freeExercises: freeList,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal memulai sesi bebas.");
        return;
      }
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setStarting(false);
    }
  }

  async function persistSet(
    setItem: WorkoutSetItem,
    overrideCompleted?: boolean,
    restSeconds?: number,
  ) {
    const draft = setDrafts[setItem.id] ?? {
      reps: setItem.reps !== null ? String(setItem.reps) : "",
      seconds: setItem.seconds !== null ? String(setItem.seconds) : "",
      rpe: setItem.rpe !== null ? String(setItem.rpe) : "",
      isCompleted: setItem.isCompleted,
    };

    const nextCompleted =
      overrideCompleted !== undefined ? overrideCompleted : draft.isCompleted;

    setSetDrafts((prev) => ({
      ...prev,
      [setItem.id]: { ...draft, isCompleted: nextCompleted },
    }));
    setSavingSetId(setItem.id);
    setError(null);

    try {
      const response = await fetch(`/api/workout/sets/${setItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reps: setItem.exercise.trackingType === "reps" ? draft.reps : null,
          seconds:
            setItem.exercise.trackingType === "time" ? draft.seconds : null,
          rpe: draft.rpe,
          isCompleted: nextCompleted,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menyimpan progres set.");
        setSetDrafts((prev) => ({
          ...prev,
          [setItem.id]: draft,
        }));
        return;
      }

      if (overrideCompleted === true && restSeconds && restSeconds > 0) {
        startCountdown("rest", restSeconds);
      }
    } catch {
      setError("Koneksi terputus saat menyimpan set.");
    } finally {
      setSavingSetId(null);
    }
  }

  async function handleSwapToLowImpact(fromExercise: ExerciseItem) {
    if (!initialActiveSession) return;
    const targetSlug = LOW_IMPACT_SWAP_SLUGS[fromExercise.slug] ?? "step-jack";
    const targetEx = exerciseBySlug.get(targetSlug);
    if (!targetEx) return;

    setSwappingExerciseId(fromExercise.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/workout/sessions/${initialActiveSession.id}/swap-exercise`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromExerciseId: fromExercise.id,
            toExerciseId: targetEx.id,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal mengganti gerakan.");
        return;
      }
      setSetDrafts({});
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSwappingExerciseId(null);
    }
  }

  async function handleFinishSession() {
    if (!initialActiveSession) return;
    setFinishing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workout/sessions/${initialActiveSession.id}/finish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overallRpe,
            note: sessionNote,
          }),
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        durationSeconds?: number;
        overallRpe?: number;
      };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menyelesaikan sesi.");
        return;
      }

      setTimerRunning(false);
      wakeLockRef.current?.release().catch(() => {});
      setCompletedSummary({
        durationSeconds: payload.durationSeconds ?? 0,
        overallRpe: payload.overallRpe ?? overallRpe,
      });
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setFinishing(false);
    }
  }

  async function handleCancelSession() {
    if (!initialActiveSession) return;
    setCanceling(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workout/sessions/${initialActiveSession.id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        setError("Gagal membatalkan sesi.");
        return;
      }
      setTimerRunning(false);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setCanceling(false);
    }
  }

  if (completedSummary) {
    const minutes = Math.max(
      1,
      Math.round(completedSummary.durationSeconds / 60),
    );
    return (
      <Card className="border-primary/50 bg-card">
        <CardHeader>
          <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">
            Sesi Tersimpan
          </CardDescription>
          <CardTitle className="text-2xl font-bold">
            Latihan Selesai
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Durasi Total</p>
              <p className="text-xl font-bold tabular-nums">{minutes} menit</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">RPE Keseluruhan</p>
              <p className="text-xl font-bold tabular-nums">
                {completedSummary.overallRpe} / 10
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Jangan lupa pendinginan 3 sampai 5 menit. Evaluasi saran progresi
            dapat dilihat di Ringkasan atau Program.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/riwayat"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Lihat Riwayat
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Kembali ke Ringkasan
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tampilan belum ada sesi aktif: pilih jadwal atau sesi bebas
  if (!initialActiveSession) {
    const chosenDay =
      allPlanDays.find((d) => d.id === selectedPlanDayId) ?? targetPlanDay;

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Pengingat Keamanan</p>
          <p className="mt-1">
            Awali dengan pemanasan 3 sampai 5 menit. Hentikan latihan jika
            muncul nyeri tajam, pusing, atau sesak berlebihan.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">
              Mulai dari Program
            </CardDescription>
            <CardTitle className="text-lg font-bold">
              {chosenDay
                ? `${WEEKDAY_NAMES_ID[chosenDay.weekday]}: ${chosenDay.title}`
                : "Jadwal Belum Tersedia"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allPlanDays.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="select-plan-day">Pilih Jadwal Hari</Label>
                <select
                  id="select-plan-day"
                  value={selectedPlanDayId ?? ""}
                  onChange={(e) =>
                    setSelectedPlanDayId(Number(e.target.value))
                  }
                  className="flex min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {allPlanDays.map((day) => (
                    <option
                      key={day.id}
                      value={day.id}
                      disabled={day.items.length === 0}
                    >
                      {WEEKDAY_NAMES_ID[day.weekday]}: {day.title}{" "}
                      {day.items.length === 0 ? "(Istirahat)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {chosenDay && chosenDay.items.length > 0 ? (
              <>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {chosenDay.items.map((item, idx) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2.5 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {idx + 1}. {item.exercise.name}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {item.targetSets} x{" "}
                        {item.exercise.trackingType === "reps"
                          ? `${item.targetReps ?? 0} reps`
                          : `${item.targetSeconds ?? 0} dtk`}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  onClick={handleStartPlanSession}
                  disabled={starting}
                  className="min-h-12 w-full text-base font-semibold"
                >
                  {starting ? "Memulai Sesi..." : "Mulai Sesi Terjadwal"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Hari ini adalah hari istirahat atau belum memiliki daftar
                gerakan. Anda tetap bisa memilih hari lain atau memulai Sesi
                Bebas di bawah.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Atau Mulai Sesi Bebas
            </CardTitle>
            <CardDescription>
              Pilih gerakan dan jumlah set sesuai kebutuhan hari ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="free-title">Judul Sesi</Label>
              <Input
                id="free-title"
                value={freeTitle}
                onChange={(e) => setFreeTitle(e.target.value)}
                className="min-h-11"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="free-exercise">Gerakan</Label>
                <select
                  id="free-exercise"
                  value={freeItems.exerciseId}
                  onChange={(e) =>
                    setFreeItems((prev) => ({
                      ...prev,
                      exerciseId: Number(e.target.value),
                    }))
                  }
                  className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="free-sets">Set</Label>
                <Input
                  id="free-sets"
                  type="number"
                  min={1}
                  max={10}
                  value={freeItems.sets}
                  onChange={(e) =>
                    setFreeItems((prev) => ({
                      ...prev,
                      sets: Number(e.target.value) || 1,
                    }))
                  }
                  className="min-h-11 tabular-nums"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!freeItems.exerciseId) return;
                    setFreeList((prev) => [...prev, freeItems]);
                  }}
                  className="min-h-11 w-full"
                >
                  + Tambah
                </Button>
              </div>
            </div>

            {freeList.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {freeList.map((item, idx) => {
                  const ex = exerciseById.get(item.exerciseId);
                  return (
                    <li
                      key={`${item.exerciseId}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>
                        {ex?.name ?? "Gerakan"} ({item.sets} set)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setFreeList((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="min-h-11 px-3 text-xs text-destructive"
                      >
                        Hapus
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={handleStartFreeSession}
              disabled={starting || freeList.length === 0}
              className="min-h-12 w-full text-base font-semibold"
            >
              {starting ? "Memulai..." : "Mulai Sesi Bebas"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tampilan sesi aktif
  const completedCount = initialActiveSession.sets.filter(
    (s) => setDrafts[s.id]?.isCompleted ?? s.isCompleted,
  ).length;
  const totalCount = initialActiveSession.sets.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Sesi Aktif ({formatDateID(initialActiveSession.sessionDate)})
          </p>
          <p className="text-lg font-bold text-foreground">
            {initialActiveSession.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-accent px-2.5 py-1 font-semibold text-accent-foreground tabular-nums">
            {completedCount}/{totalCount} set selesai
          </span>
          <span className="rounded-md border border-border px-2.5 py-1 text-muted-foreground">
            {wakeLockState === "active"
              ? "Layar tetap menyala"
              : "Layar otomatis"}
          </span>
        </div>
      </div>

      {/* Timer Kerja / Istirahat Besar */}
      <Card className="border-primary/40 bg-card">
        <CardContent className="space-y-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={timerMode === "rest" ? "default" : "outline"}
                onClick={() => {
                  setTimerRunning(false);
                  setTimerMode("rest");
                  setTimerDuration(45);
                  setTimerRemaining(45);
                }}
                className="min-h-11 px-4 text-sm"
              >
                Istirahat
              </Button>
              <Button
                type="button"
                variant={timerMode === "work" ? "default" : "outline"}
                onClick={() => {
                  setTimerRunning(false);
                  setTimerMode("work");
                  setTimerDuration(40);
                  setTimerRemaining(40);
                }}
                className="min-h-11 px-4 text-sm"
              >
                Kerja
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[20, 40, 45, 60, 90].map((sec) => (
                <Button
                  key={sec}
                  type="button"
                  variant="outline"
                  onClick={() => startCountdown(timerMode, sec)}
                  className="min-h-11 px-3 text-xs tabular-nums"
                >
                  {sec}d
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Timer {timerMode === "rest" ? "Istirahat" : "Kerja"}
              </p>
              <p
                aria-live="polite"
                className={cn(
                  "text-5xl font-bold tracking-tight tabular-nums",
                  timerRemaining === 0 ? "text-primary" : "text-foreground",
                )}
              >
                {formatClock(timerRemaining)}
              </p>
            </div>

            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                type="button"
                onClick={() => {
                  if (timerRemaining === 0) {
                    setTimerRemaining(timerDuration);
                  }
                  setTimerRunning((prev) => !prev);
                }}
                className="min-h-12 flex-1 px-6 text-base font-semibold sm:flex-initial"
              >
                {timerRunning ? "Jeda" : "Mulai"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerRemaining(0);
                }}
                className="min-h-12 flex-1 px-5 text-base sm:flex-initial"
              >
                Lewati
              </Button>
            </div>
          </div>
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

      {/* Daftar Gerakan dan Set */}
      <div className="space-y-4">
        {exerciseGroups.map((group) => {
          const isCuesOpen = openCuesId === group.exercise.id;
          const isTime = group.exercise.trackingType === "time";

          return (
            <Card key={group.exercise.id} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">
                      {group.exercise.name}
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {group.exercise.primaryMuscle} | Istirahat{" "}
                      {group.restSeconds} dtk
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isTime && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const defaultSec = group.sets[0]?.seconds ?? 30;
                          startCountdown("work", defaultSec);
                        }}
                        className="min-h-11 px-3 text-xs font-semibold"
                      >
                        Timer Kerja
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setOpenCuesId(isCuesOpen ? null : group.exercise.id)
                      }
                      className="min-h-11 px-3 text-xs"
                    >
                      {isCuesOpen ? "Tutup Tips" : "Tips Form"}
                    </Button>
                    {!group.exercise.isLowImpact && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSwapToLowImpact(group.exercise)}
                        disabled={swappingExerciseId === group.exercise.id}
                        className="min-h-11 px-3 text-xs font-semibold"
                      >
                        {swappingExerciseId === group.exercise.id
                          ? "Mengganti..."
                          : "Versi Low-Impact"}
                      </Button>
                    )}
                  </div>
                </div>

                {isCuesOpen && (
                  <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {group.exercise.instructions}
                    </p>
                    {group.exercise.cues && (
                      <p className="mt-1">Tips: {group.exercise.cues}</p>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {group.sets.map((setItem) => {
                  const draft = setDrafts[setItem.id] ?? {
                    reps: setItem.reps !== null ? String(setItem.reps) : "",
                    seconds:
                      setItem.seconds !== null ? String(setItem.seconds) : "",
                    rpe: setItem.rpe !== null ? String(setItem.rpe) : "",
                    isCompleted: setItem.isCompleted,
                  };
                  const isBusy = savingSetId === setItem.id;

                  return (
                    <div
                      key={setItem.id}
                      className={cn(
                        "grid grid-cols-1 gap-2.5 rounded-lg border p-3 sm:grid-cols-[72px_1fr_100px_130px] sm:items-center",
                        draft.isCompleted
                          ? "border-primary/40 bg-accent/35"
                          : "border-border bg-background",
                      )}
                    >
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        Set {setItem.setNumber}
                      </span>

                      <div className="space-y-1">
                        <Label
                          htmlFor={`val-${setItem.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          {isTime ? "Durasi aktual (detik)" : "Reps aktual"}
                        </Label>
                        <Input
                          id={`val-${setItem.id}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={isTime ? 3600 : 500}
                          value={isTime ? draft.seconds : draft.reps}
                          onChange={(e) =>
                            setSetDrafts((prev) => ({
                              ...prev,
                              [setItem.id]: {
                                ...draft,
                                reps: isTime ? draft.reps : e.target.value,
                                seconds: isTime
                                  ? e.target.value
                                  : draft.seconds,
                              },
                            }))
                          }
                          onBlur={() => persistSet(setItem)}
                          className="min-h-12 text-base font-semibold tabular-nums"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor={`rpe-${setItem.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          RPE (1-10)
                        </Label>
                        <Input
                          id={`rpe-${setItem.id}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          placeholder="-"
                          value={draft.rpe}
                          onChange={(e) =>
                            setSetDrafts((prev) => ({
                              ...prev,
                              [setItem.id]: {
                                ...draft,
                                rpe: e.target.value,
                              },
                            }))
                          }
                          onBlur={() => persistSet(setItem)}
                          className="min-h-12 text-base tabular-nums"
                        />
                      </div>

                      <Button
                        type="button"
                        variant={draft.isCompleted ? "default" : "outline"}
                        disabled={isBusy}
                        onClick={() =>
                          persistSet(
                            setItem,
                            !draft.isCompleted,
                            group.restSeconds,
                          )
                        }
                        className="min-h-12 w-full text-sm font-semibold"
                      >
                        {isBusy
                          ? "Menyimpan..."
                          : draft.isCompleted
                            ? "Selesai"
                            : "Centang Set"}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selesai / Batal Sesi */}
      <Card className="border-border bg-card">
        <CardContent className="space-y-4 py-5">
          {showFinishPanel ? (
            <div className="space-y-4">
              <div>
                <p className="text-base font-bold text-foreground">
                  Selesaikan Sesi Latihan
                </p>
                <p className="text-xs text-muted-foreground">
                  Pilih RPE keseluruhan sesi (1 = sangat ringan, 10 = maksimal).
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant={overallRpe === val ? "default" : "outline"}
                    onClick={() => setOverallRpe(val)}
                    aria-pressed={overallRpe === val}
                    className="min-h-12 text-base font-bold tabular-nums"
                  >
                    {val}
                  </Button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-note">Catatan Sesi (opsional)</Label>
                <Textarea
                  id="session-note"
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="Misal: bahu terasa nyaman, fokus kontrol tempo"
                  rows={2}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleFinishSession}
                  disabled={finishing}
                  className="min-h-12 flex-1 px-6 text-base font-semibold sm:flex-initial"
                >
                  {finishing ? "Menyimpan Sesi..." : "Simpan & Selesai"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFinishPanel(false)}
                  disabled={finishing}
                  className="min-h-12 px-4"
                >
                  Kembali
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                onClick={() => setShowFinishPanel(true)}
                className="min-h-12 px-6 text-base font-semibold"
              >
                Selesai Latihan
              </Button>

              {confirmCancel ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleCancelSession}
                    disabled={canceling}
                    className="min-h-11 px-4 text-sm"
                  >
                    {canceling ? "Membatalkan..." : "Konfirmasi Batal Sesi"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmCancel(false)}
                    disabled={canceling}
                    className="min-h-11 px-4 text-sm"
                  >
                    Lanjutkan
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmCancel(true)}
                  className="min-h-11 px-4 text-sm text-muted-foreground hover:text-destructive"
                >
                  Batalkan Sesi
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
