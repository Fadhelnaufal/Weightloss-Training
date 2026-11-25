"use client";

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
import type { ProgressionSuggestion } from "@/lib/calc/workout";

interface ProgressionSuggestionsProps {
  suggestions: ReadonlyArray<ProgressionSuggestion>;
}

export function ProgressionSuggestions({
  suggestions,
}: ProgressionSuggestionsProps) {
  const router = useRouter();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleSuggestions = suggestions.filter(
    (item) => !dismissedIds.includes(item.id),
  );

  if (visibleSuggestions.length === 0 && !feedback) {
    return null;
  }

  async function handleApprove(item: ProgressionSuggestion) {
    if (item.type === "deload" || !item.planItemId || !item.nextExerciseId) {
      setDismissedIds((prev) => [...prev, item.id]);
      setFeedback("Pengingat minggu deload ditandai dipahami.");
      return;
    }

    setError(null);
    setFeedback(null);
    setBusyId(item.id);

    try {
      const response = await fetch("/api/progression/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planItemId: item.planItemId,
          exerciseId: item.nextExerciseId,
          targetReps: item.nextTargetReps,
          targetSeconds: item.nextTargetSeconds,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menerapkan saran ke program.");
        return;
      }

      setDismissedIds((prev) => [...prev, item.id]);
      setFeedback(`Program diperbarui: ${item.actionLabel}.`);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="Saran progresi" className="space-y-3">
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

      {visibleSuggestions.map((item) => (
        <Card key={item.id} className="border-primary/40 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">
              Saran Progresi ({item.dayTitle})
            </CardDescription>
            <CardTitle className="text-base font-bold">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{item.reason}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleApprove(item)}
                disabled={busyId === item.id}
                className="min-h-11 px-4 text-sm font-semibold"
              >
                {busyId === item.id ? "Menerapkan..." : item.actionLabel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDismissedIds((prev) => [...prev, item.id])
                }
                disabled={busyId === item.id}
                className="min-h-11 px-4 text-sm"
              >
                Abaikan
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
