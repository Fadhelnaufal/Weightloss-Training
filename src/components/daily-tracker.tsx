"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
import { formatDateID } from "@/lib/date";
import type { DailyLogItem } from "@/lib/db/queries";

interface DailyTrackerProps {
  todayDateWIB: string;
  logs: ReadonlyArray<DailyLogItem>;
  stepTarget: number;
}

const ENERGY_LABELS: Record<number, string> = {
  1: "1 - Sangat lelah",
  2: "2 - Lelah",
  3: "3 - Cukup",
  4: "4 - Segar",
  5: "5 - Sangat bugar",
};

export function DailyTracker({
  todayDateWIB,
  logs,
  stepTarget,
}: DailyTrackerProps) {
  const router = useRouter();
  const initialToday = logs.find((item) => item.logDate === todayDateWIB);

  const [logDate, setLogDate] = useState(todayDateWIB);
  const [steps, setSteps] = useState(
    initialToday?.steps !== null && initialToday?.steps !== undefined
      ? String(initialToday.steps)
      : "",
  );
  const [sleepHours, setSleepHours] = useState(
    initialToday?.sleepHours !== null &&
      initialToday?.sleepHours !== undefined
      ? String(initialToday.sleepHours)
      : "",
  );
  const [energyScore, setEnergyScore] = useState<number | null>(
    initialToday?.energyScore ?? null,
  );
  const [note, setNote] = useState(initialToday?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function loadDateIntoForm(dateStr: string) {
    setLogDate(dateStr);
    setError(null);
    setFeedback(null);
    const match = logs.find((item) => item.logDate === dateStr);
    setSteps(
      match?.steps !== null && match?.steps !== undefined
        ? String(match.steps)
        : "",
    );
    setSleepHours(
      match?.sleepHours !== null && match?.sleepHours !== undefined
        ? String(match.sleepHours)
        : "",
    );
    setEnergyScore(match?.energyScore ?? null);
    setNote(match?.note ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/daily", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logDate,
          steps,
          sleepHours,
          energyScore,
          note,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menyimpan pelacak harian.");
        return;
      }

      setFeedback(
        `Pelacak harian untuk ${formatDateID(logDate)} berhasil disimpan.`,
      );
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Input Pelacak Harian
          </CardTitle>
          <CardDescription>
            Target langkah Anda:{" "}
            <strong className="font-semibold text-foreground tabular-nums">
              {stepTarget.toLocaleString("id-ID")} langkah/hari
            </strong>
            . Input ulang pada tanggal sama memperbarui data hari tersebut.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="dailyDate">Tanggal (WIB)</Label>
                <Input
                  id="dailyDate"
                  type="date"
                  value={logDate}
                  onChange={(e) => loadDateIntoForm(e.target.value)}
                  className="min-h-12 text-base tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="steps">Langkah</Label>
                <Input
                  id="steps"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={200000}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="Contoh: 8500"
                  className="min-h-12 text-base font-semibold tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sleepHours">Jam Tidur</Label>
                <Input
                  id="sleepHours"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={0}
                  max={24}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="Contoh: 7.5"
                  className="min-h-12 text-base tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Skor Energi (1-5)</Label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <Button
                    key={score}
                    type="button"
                    variant={energyScore === score ? "default" : "outline"}
                    onClick={() =>
                      setEnergyScore((prev) => (prev === score ? null : score))
                    }
                    aria-pressed={energyScore === score}
                    className="min-h-12 text-base font-bold tabular-nums"
                  >
                    {score}
                  </Button>
                ))}
              </div>
              {energyScore !== null && (
                <p className="text-xs text-muted-foreground">
                  Dipilih: {ENERGY_LABELS[energyScore]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dailyNote">Catatan (opsional)</Label>
              <Textarea
                id="dailyNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: jalan sore 30 menit, tidur nyenyak"
                rows={2}
              />
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
              {submitting ? "Menyimpan..." : "Simpan Pelacak Harian"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Riwayat Harian</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              Belum ada catatan harian.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {logs.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground tabular-nums">
                      {formatDateID(item.logDate)}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                      <span>
                        Langkah:{" "}
                        {item.steps !== null
                          ? `${item.steps.toLocaleString("id-ID")} / ${stepTarget.toLocaleString("id-ID")}`
                          : "-"}
                      </span>
                      <span>
                        Tidur:{" "}
                        {item.sleepHours !== null
                          ? `${item.sleepHours} jam`
                          : "-"}
                      </span>
                      <span>
                        Energi:{" "}
                        {item.energyScore !== null
                          ? `${item.energyScore}/5`
                          : "-"}
                      </span>
                    </div>
                    {item.note && (
                      <p className="text-xs text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadDateIntoForm(item.logDate)}
                    className="min-h-11 shrink-0 px-4 text-xs"
                  >
                    Ubah
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
