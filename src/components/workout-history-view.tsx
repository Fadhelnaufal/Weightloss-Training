"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatDateID, formatShortDateID } from "@/lib/date";
import type {
  ExerciseProgressSessionPoint,
  ExerciseProgressSummary,
  WorkoutSessionDetail,
} from "@/lib/db/queries";

interface WorkoutHistoryViewProps {
  sessions: ReadonlyArray<WorkoutSessionDetail>;
  progressSummaries: ReadonlyArray<ExerciseProgressSummary>;
}

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface ProgressTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: ExerciseProgressSessionPoint;
  }>;
}

function ProgressTooltip({ active, payload }: ProgressTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-popover-foreground">
        {formatDateID(point.sessionDate)}
      </p>
      <p className="text-muted-foreground">{point.sessionTitle}</p>
      <p className="mt-1 font-bold text-primary tabular-nums">
        Terbaik: {point.bestValue}{" "}
        {point.trackingType === "reps" ? "reps" : "detik"}
      </p>
    </div>
  );
}

export function WorkoutHistoryView({
  sessions,
  progressSummaries,
}: WorkoutHistoryViewProps) {
  const isClient = useIsClient();
  const [selectedExerciseId, setSelectedExerciseId] = useState<number>(
    progressSummaries[0]?.exercise.id ?? 0,
  );
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(
    sessions[0]?.id ?? null,
  );

  const activeSummary = useMemo(
    () =>
      progressSummaries.find(
        (item) => item.exercise.id === selectedExerciseId,
      ) ??
      progressSummaries[0] ??
      null,
    [progressSummaries, selectedExerciseId],
  );

  if (sessions.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada sesi workout yang selesai dicatat.
          </p>
          <Link
            href="/workout/hari-ini"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Mulai Latihan Pertama
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Progres Per Gerakan
          </CardTitle>
          <CardDescription>
            Menampilkan reps terbaik atau durasi terbaik per sesi selesai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {progressSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada set selesai untuk digrafikkan.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="select-exercise-progress">Pilih Gerakan</Label>
                <select
                  id="select-exercise-progress"
                  value={activeSummary?.exercise.id ?? ""}
                  onChange={(e) =>
                    setSelectedExerciseId(Number(e.target.value))
                  }
                  className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {progressSummaries.map((item) => (
                    <option key={item.exercise.id} value={item.exercise.id}>
                      {item.exercise.name} ({item.points.length} sesi)
                    </option>
                  ))}
                </select>
              </div>

              {activeSummary && activeSummary.points.length > 0 && (
                !isClient ? (
                  <div className="h-60 w-full animate-pulse rounded-lg bg-muted" />
                ) : (
                  <div className="h-60 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={activeSummary.points}
                        margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                      >
                        <CartesianGrid
                          stroke="var(--border)"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="sessionDate"
                          tickFormatter={formatShortDateID}
                          tick={{
                            fontSize: 12,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          tick={{
                            fontSize: 12,
                            fill: "var(--muted-foreground)",
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={42}
                        />
                        <Tooltip content={<ProgressTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="bestValue"
                          stroke="var(--chart-2)"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "var(--chart-2)" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Daftar Sesi Selesai ({sessions.length})
          </CardTitle>
          <CardDescription>
            Ketuk sesi untuk melihat rincian setiap set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            const durationMins = session.durationSeconds
              ? Math.max(1, Math.round(session.durationSeconds / 60))
              : null;
            const completedSetsCount = session.sets.filter(
              (s) => s.isCompleted,
            ).length;

            // Kelompokkan set per gerakan agar rapi saat dibuka
            const setsByExercise = new Map<
              number,
              { name: string; trackingType: "reps" | "time"; sets: typeof session.sets }
            >();
            for (const s of session.sets) {
              const entry = setsByExercise.get(s.exerciseId) ?? {
                name: s.exercise.name,
                trackingType: s.exercise.trackingType,
                sets: [],
              };
              entry.sets.push(s);
              setsByExercise.set(s.exerciseId, entry);
            }

            return (
              <div
                key={session.id}
                className="rounded-lg border border-border bg-background"
              >
                <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-foreground">
                      {session.title}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                      <span>{formatDateID(session.sessionDate)}</span>
                      {durationMins !== null && (
                        <span>{durationMins} menit</span>
                      )}
                      {session.overallRpe !== null && (
                        <span>RPE {session.overallRpe}/10</span>
                      )}
                      <span>
                        {completedSetsCount}/{session.sets.length} set selesai
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setExpandedSessionId(isExpanded ? null : session.id)
                    }
                    aria-expanded={isExpanded}
                    className="min-h-11 shrink-0 px-4 text-xs font-medium"
                  >
                    {isExpanded ? "Tutup Detail" : "Lihat Detail Set"}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
                    {session.note && (
                      <p className="rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        Catatan: {session.note}
                      </p>
                    )}

                    {Array.from(setsByExercise.values()).map((group) => (
                      <div key={group.name} className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {group.name}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.sets.map((s) => (
                            <span
                              key={s.id}
                              className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs tabular-nums text-muted-foreground"
                            >
                              Set {s.setNumber}:{" "}
                              <strong className="text-foreground">
                                {group.trackingType === "reps"
                                  ? `${s.reps ?? 0} reps`
                                  : `${s.seconds ?? 0} dtk`}
                              </strong>
                              {s.rpe !== null ? ` (RPE ${s.rpe})` : ""}
                              {!s.isCompleted ? " [tidak selesai]" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
