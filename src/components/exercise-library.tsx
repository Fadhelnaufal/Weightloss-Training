"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ExerciseItem } from "@/lib/db/queries";

const CATEGORY_LABELS: Record<ExerciseItem["category"], string> = {
  push: "Push",
  pull: "Pull",
  squat: "Squat",
  hinge: "Hinge / Glute",
  lunge: "Lunge",
  core: "Core",
  cardio: "Kardio",
  mobility: "Mobilitas",
};

interface ExerciseLibraryProps {
  exercises: ReadonlyArray<ExerciseItem>;
}

export function ExerciseLibrary({ exercises }: ExerciseLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lowImpactOnly, setLowImpactOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveExerciseId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const availableCategories = useMemo(() => {
    const present = new Set(exercises.map((ex) => ex.category));
    return (
      Object.keys(CATEGORY_LABELS) as Array<ExerciseItem["category"]>
    ).filter((cat) => present.has(cat));
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (selectedCategory !== "all" && ex.category !== selectedCategory) {
        return false;
      }
      if (lowImpactOnly && !ex.isLowImpact) {
        return false;
      }
      if (
        query &&
        !ex.name.toLowerCase().includes(query) &&
        !ex.primaryMuscle.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [exercises, selectedCategory, lowImpactOnly, searchQuery]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<ExerciseItem["category"], ExerciseItem[]>();
    for (const ex of filteredExercises) {
      const list = map.get(ex.category) ?? [];
      list.push(ex);
      map.set(ex.category, list);
    }
    return Array.from(map.entries());
  }, [filteredExercises]);

  const activeExercise = useMemo(
    () => exercises.find((ex) => ex.id === activeExerciseId) ?? null,
    [exercises, activeExerciseId],
  );

  const progressionChain = useMemo(() => {
    if (!activeExercise) return [];
    return exercises
      .filter((ex) => ex.progressionGroup === activeExercise.progressionGroup)
      .sort((a, b) => a.difficultyLevel - b.difficultyLevel || a.id - b.id);
  }, [exercises, activeExercise]);

  if (exercises.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Belum ada gerakan di database. Jalankan <code>npm run db:seed</code>{" "}
          terlebih dahulu.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari gerakan atau otot (misal: push-up, paha)..."
              aria-label="Cari gerakan"
              className="min-h-11 flex-1"
            />
            <Button
              type="button"
              variant={lowImpactOnly ? "default" : "outline"}
              onClick={() => setLowImpactOnly((prev) => !prev)}
              aria-pressed={lowImpactOnly}
              className="min-h-11 shrink-0 px-4 text-sm font-medium"
            >
              {lowImpactOnly ? "Low-Impact: Aktif" : "Filter Low-Impact"}
            </Button>
          </div>

          <div
            role="group"
            aria-label="Filter kategori gerakan"
            className="flex flex-wrap gap-2"
          >
            <Button
              type="button"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              aria-pressed={selectedCategory === "all"}
              className="min-h-11 px-3.5 text-xs font-medium sm:text-sm"
            >
              Semua ({exercises.length})
            </Button>
            {availableCategories.map((cat) => (
              <Button
                key={cat}
                type="button"
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className="min-h-11 px-3.5 text-xs font-medium sm:text-sm"
              >
                {CATEGORY_LABELS[cat]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeExercise && (
        <Card
          role="region"
          aria-label="Detail gerakan"
          className="border-primary/50 bg-card shadow-sm"
        >
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {CATEGORY_LABELS[activeExercise.category]}
                </span>
                <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  Level {activeExercise.difficultyLevel}
                </span>
                <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {activeExercise.isLowImpact ? "Low-Impact" : "High-Impact"}
                </span>
                <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Target:{" "}
                  {activeExercise.trackingType === "reps" ? "Repetisi" : "Waktu"}
                </span>
              </div>
              <CardTitle className="mt-2 text-xl font-bold">
                {activeExercise.name}
              </CardTitle>
              <CardDescription className="mt-1">
                Otot utama: {activeExercise.primaryMuscle}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveExerciseId(null)}
              className="min-h-11 shrink-0 px-4 text-sm"
            >
              Tutup Detail
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                Cara Melakukan
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {activeExercise.instructions}
              </p>
            </div>

            {activeExercise.cues && (
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Tips Form
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeExercise.cues}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Rantai Progresi ({activeExercise.progressionGroup})
              </p>
              <div className="flex flex-wrap gap-2">
                {progressionChain.map((step) => {
                  const isCurrent = step.id === activeExercise.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveExerciseId(step.id)}
                      className={cn(
                        "min-h-11 rounded-lg border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="block font-semibold">
                        Lv {step.difficultyLevel}: {step.name}
                      </span>
                      <span
                        className={cn(
                          "block text-[11px]",
                          isCurrent
                            ? "text-primary-foreground/90"
                            : "text-muted-foreground",
                        )}
                      >
                        {step.isLowImpact ? "Low-impact" : "Berlompat"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {groupedByCategory.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada gerakan yang sesuai dengan filter Anda.
          </CardContent>
        </Card>
      ) : (
        groupedByCategory.map(([category, list]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-base font-bold text-foreground">
              {CATEGORY_LABELS[category]} ({list.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((ex) => {
                const isSelected = activeExerciseId === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setActiveExerciseId(ex.id)}
                    aria-expanded={isSelected}
                    className={cn(
                      "flex min-h-16 flex-col justify-between rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isSelected
                        ? "border-primary bg-accent/40"
                        : "border-border bg-card hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {ex.name}
                      </span>
                      <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground tabular-nums">
                        Lv {ex.difficultyLevel}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{ex.primaryMuscle}</span>
                      <span>
                        {ex.isLowImpact ? "Low-impact" : "High-impact"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
