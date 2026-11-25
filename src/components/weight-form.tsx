"use client";

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
import { Textarea } from "@/components/ui/textarea";
import type { WeightLogItem } from "@/lib/db/queries";

interface WeightFormProps {
  defaultDateWIB: string;
  existingLogs: ReadonlyArray<WeightLogItem>;
}

export function WeightForm({ defaultDateWIB, existingLogs }: WeightFormProps) {
  const router = useRouter();
  const [logDate, setLogDate] = useState(defaultDateWIB);
  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const matchingLog = useMemo(
    () => existingLogs.find((item) => item.logDate === logDate) ?? null,
    [existingLogs, logDate],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logDate,
          weightKg,
          waistCm,
          note,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menyimpan berat badan.");
        return;
      }

      setFeedback(
        matchingLog
          ? "Catatan berat untuk tanggal ini berhasil diperbarui."
          : "Catatan berat berhasil disimpan.",
      );
      setWeightKg("");
      setWaistCm("");
      setNote("");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card id="catat" className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Catat Berat Badan</CardTitle>
        <CardDescription>
          Input ulang pada tanggal yang sama otomatis memperbarui catatan hari
          tersebut.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="weightKg">Berat Badan (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="20"
                max="300"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder={
                  matchingLog ? `${matchingLog.weightKg.toFixed(1)}` : "72.4"
                }
                className="min-h-12 text-lg font-semibold tabular-nums"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logDate">Tanggal (WIB)</Label>
              <Input
                id="logDate"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="min-h-12 text-base tabular-nums"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waistCm">Lingkar Pinggang (cm, opsional)</Label>
              <Input
                id="waistCm"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="30"
                max="250"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                placeholder="82.0"
                className="min-h-12 text-base tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Misal: timbang pagi sebelum makan"
              maxLength={500}
              rows={2}
              className="text-base"
            />
          </div>

          {matchingLog && (
            <p className="rounded-lg border border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
              Sudah ada entri pada tanggal ini ({matchingLog.weightKg.toFixed(1)}{" "}
              kg). Menyimpan akan memperbarui data tersebut.
            </p>
          )}

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
            {submitting
              ? "Menyimpan..."
              : matchingLog
                ? "Perbarui Catatan"
                : "Simpan Catatan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
