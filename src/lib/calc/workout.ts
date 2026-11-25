import { getIsoWeekday, shiftDateString } from "../date";

export interface ScheduleDayRule {
  weekday: number;
  dayType: "strength" | "cardio" | "circuit" | "rest" | "active_rest";
  isActive: boolean;
}

export interface ExerciseCatalogEntry {
  id: number;
  slug: string;
  name: string;
  trackingType: "reps" | "time";
  difficultyLevel: number;
  progressionGroup: string;
  isLowImpact: boolean;
}

export interface PlanItemTarget {
  planItemId: number;
  planDayId: number;
  weekday: number;
  dayTitle: string;
  exerciseId: number;
  targetSets: number;
  targetReps: number | null;
  targetSeconds: number | null;
}

export interface FinishedSessionSet {
  exerciseId: number;
  reps: number | null;
  seconds: number | null;
  rpe: number | null;
  isCompleted: boolean;
}

export interface FinishedSessionRecord {
  sessionId: number;
  sessionDate: string;
  overallRpe: number | null;
  sets: ReadonlyArray<FinishedSessionSet>;
}

export type ProgressionSuggestionType =
  | "increase_volume"
  | "level_up_variant"
  | "regress_or_hold"
  | "deload";

export interface ProgressionSuggestion {
  id: string;
  type: ProgressionSuggestionType;
  planItemId: number | null;
  dayTitle: string;
  exerciseId: number | null;
  exerciseName: string;
  title: string;
  reason: string;
  actionLabel: string;
  nextExerciseId: number | null;
  nextExerciseName: string | null;
  nextTargetReps: number | null;
  nextTargetSeconds: number | null;
}

function isRestOrPausedDay(rule: ScheduleDayRule | undefined): boolean {
  if (!rule) {
    return true;
  }
  return (
    rule.dayType === "rest" ||
    rule.dayType === "active_rest" ||
    !rule.isActive
  );
}

/**
 * Menghitung streak latihan berdasarkan aturan DATA-MODEL.md:
 * jumlah hari berurutan terakhir yang memiliki workout_sessions selesai (finished_at terisi);
 * hari rest / active_rest (atau hari kardio nonaktif) tidak memutus streak.
 */
export function calculateWorkoutStreak(
  completedSessionDates: ReadonlyArray<string>,
  schedule: ReadonlyArray<ScheduleDayRule>,
  referenceDate: string,
): number {
  if (completedSessionDates.length === 0) {
    return 0;
  }

  const completedSet = new Set(completedSessionDates);
  const earliestDate = [...completedSet].sort()[0];
  const ruleByWeekday = new Map<number, ScheduleDayRule>();
  for (const rule of schedule) {
    ruleByWeekday.set(rule.weekday, rule);
  }

  let cursor = referenceDate;
  const todayRule = ruleByWeekday.get(getIsoWeekday(referenceDate));

  // Jika hari ini adalah hari latihan tetapi belum selesai dilakukan,
  // mulai evaluasi dari kemarin agar streak berjalan tidak hilang di tengah hari.
  if (!completedSet.has(referenceDate) && !isRestOrPausedDay(todayRule)) {
    cursor = shiftDateString(referenceDate, -1);
  }

  let streak = 0;
  let guard = 0;

  while (cursor >= earliestDate && guard < 3650) {
    guard += 1;
    if (completedSet.has(cursor)) {
      streak += 1;
      cursor = shiftDateString(cursor, -1);
      continue;
    }

    const rule = ruleByWeekday.get(getIsoWeekday(cursor));
    if (isRestOrPausedDay(rule)) {
      cursor = shiftDateString(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
}

interface EvaluatedSessionExercise {
  allCompleted: boolean;
  allMetTarget: boolean;
  allMetUpperBound: boolean;
  maxRpe: number | null;
}

function evaluateSessionExercise(
  session: FinishedSessionRecord,
  planItem: PlanItemTarget,
  exercise: ExerciseCatalogEntry,
): EvaluatedSessionExercise | null {
  const matchingSets = session.sets.filter(
    (s) => s.exerciseId === exercise.id,
  );
  if (matchingSets.length === 0) {
    return null;
  }

  const allCompleted = matchingSets.every((s) => s.isCompleted);
  const rpes = matchingSets
    .map((s) => s.rpe ?? session.overallRpe)
    .filter((value): value is number => value !== null);
  const maxRpe = rpes.length > 0 ? Math.max(...rpes) : null;

  const targetValue =
    exercise.trackingType === "reps"
      ? (planItem.targetReps ?? 0)
      : (planItem.targetSeconds ?? 0);
  const upperBound = exercise.trackingType === "reps" ? 15 : 45;

  const getActualValue = (setItem: FinishedSessionSet) =>
    exercise.trackingType === "reps"
      ? (setItem.reps ?? 0)
      : (setItem.seconds ?? 0);

  const allMetTarget =
    allCompleted &&
    matchingSets.every((setItem) => getActualValue(setItem) >= targetValue);

  const allMetUpperBound =
    allCompleted &&
    matchingSets.every((setItem) => getActualValue(setItem) >= upperBound);

  return {
    allCompleted,
    allMetTarget,
    allMetUpperBound,
    maxRpe,
  };
}

function getIsoWeekKey(dateStr: string): string {
  const weekday = getIsoWeekday(dateStr);
  const monday = shiftDateString(dateStr, -(weekday - 1));
  return monday;
}

/**
 * Mengevaluasi saran progresi per gerakan pada program berdasarkan aturan PROGRAM-SEED.md bagian 3.
 * Hanya menghasilkan saran; tidak pernah mengubah database secara otomatis.
 */
export function evaluateProgressionSuggestions(params: {
  exercises: ReadonlyArray<ExerciseCatalogEntry>;
  planItems: ReadonlyArray<PlanItemTarget>;
  finishedSessions: ReadonlyArray<FinishedSessionRecord>;
}): ProgressionSuggestion[] {
  const { exercises, planItems, finishedSessions } = params;
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const sortedSessions = [...finishedSessions].sort((a, b) =>
    b.sessionDate.localeCompare(a.sessionDate) || b.sessionId - a.sessionId,
  );

  const suggestions: ProgressionSuggestion[] = [];
  const seenPlanItemIds = new Set<number>();

  for (const planItem of planItems) {
    if (seenPlanItemIds.has(planItem.planItemId)) {
      continue;
    }
    seenPlanItemIds.add(planItem.planItemId);

    const exercise = exerciseById.get(planItem.exerciseId);
    if (!exercise) {
      continue;
    }

    const recentEval: EvaluatedSessionExercise[] = [];
    for (const session of sortedSessions) {
      const evaluated = evaluateSessionExercise(session, planItem, exercise);
      if (evaluated) {
        recentEval.push(evaluated);
      }
      if (recentEval.length >= 3) {
        break;
      }
    }

    if (recentEval.length < 2) {
      continue;
    }

    // Aturan 3: Turun / tahan (RPE >= 9 atau set tidak selesai pada 2 sesi berturut-turut)
    const lastTwoStruggled = recentEval
      .slice(0, 2)
      .every(
        (item) =>
          !item.allCompleted || (item.maxRpe !== null && item.maxRpe >= 9),
      );

    if (lastTwoStruggled) {
      const easierVariant = exercises
        .filter(
          (candidate) =>
            candidate.progressionGroup === exercise.progressionGroup &&
            candidate.difficultyLevel === exercise.difficultyLevel - 1,
        )
        .sort((a, b) => a.id - b.id)[0];

      if (easierVariant) {
        const fallbackReps =
          easierVariant.trackingType === "reps" ? 8 : null;
        const fallbackSeconds =
          easierVariant.trackingType === "time" ? 20 : null;
        suggestions.push({
          id: `regress-${planItem.planItemId}`,
          type: "regress_or_hold",
          planItemId: planItem.planItemId,
          dayTitle: planItem.dayTitle,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          title: `Pertimbangkan turun level: ${exercise.name}`,
          reason:
            "Pada 2 sesi terakhir RPE >= 9 atau ada set belum selesai. Anda bisa menurunkan 1 level ke varian lebih ringan atau menahan target saat ini.",
          actionLabel: `Ganti ke ${easierVariant.name}`,
          nextExerciseId: easierVariant.id,
          nextExerciseName: easierVariant.name,
          nextTargetReps: fallbackReps,
          nextTargetSeconds: fallbackSeconds,
        });
      } else {
        const reducedReps =
          exercise.trackingType === "reps"
            ? Math.max(4, (planItem.targetReps ?? 8) - 1)
            : null;
        const reducedSeconds =
          exercise.trackingType === "time"
            ? Math.max(10, (planItem.targetSeconds ?? 20) - 5)
            : null;
        suggestions.push({
          id: `hold-${planItem.planItemId}`,
          type: "regress_or_hold",
          planItemId: planItem.planItemId,
          dayTitle: planItem.dayTitle,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          title: `Tahan atau kurangi target: ${exercise.name}`,
          reason:
            "Pada 2 sesi terakhir RPE >= 9 atau ada set belum selesai. Disarankan menahan beban atau sedikit mengurangi target.",
          actionLabel:
            exercise.trackingType === "reps"
              ? `Turunkan ke ${reducedReps} reps`
              : `Turunkan ke ${reducedSeconds} dtk`,
          nextExerciseId: exercise.id,
          nextExerciseName: exercise.name,
          nextTargetReps: reducedReps,
          nextTargetSeconds: reducedSeconds,
        });
      }
      continue;
    }

    // Aturan 2: Naik varian (batas atas >= 15 reps atau >= 45 dtk dengan RPE <= 7 dalam 3 sesi berturut-turut)
    if (recentEval.length >= 3) {
      const lastThreeReadyForVariant = recentEval
        .slice(0, 3)
        .every(
          (item) =>
            item.allMetUpperBound && item.maxRpe !== null && item.maxRpe <= 7,
        );

      if (lastThreeReadyForVariant) {
        const nextVariant = exercises
          .filter(
            (candidate) =>
              candidate.progressionGroup === exercise.progressionGroup &&
              candidate.difficultyLevel === exercise.difficultyLevel + 1,
          )
          .sort((a, b) => a.id - b.id)[0];

        if (nextVariant) {
          const nextReps = nextVariant.trackingType === "reps" ? 6 : null;
          const nextSeconds = nextVariant.trackingType === "time" ? 20 : null;
          suggestions.push({
            id: `levelup-${planItem.planItemId}`,
            type: "level_up_variant",
            planItemId: planItem.planItemId,
            dayTitle: planItem.dayTitle,
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            title: `Naik level gerakan: ${exercise.name} -> ${nextVariant.name}`,
            reason:
              "Semua set mencapai batas atas dengan RPE <= 7 selama 3 sesi berturut-turut.",
            actionLabel:
              nextVariant.trackingType === "reps"
                ? `Naik ke ${nextVariant.name} (${nextReps} reps)`
                : `Naik ke ${nextVariant.name} (${nextSeconds} dtk)`,
            nextExerciseId: nextVariant.id,
            nextExerciseName: nextVariant.name,
            nextTargetReps: nextReps,
            nextTargetSeconds: nextSeconds,
          });
          continue;
        }
      }
    }

    // Aturan 1: Naik reps/durasi (semua set capai target dengan RPE <= 7 pada 2 sesi berturut-turut)
    const lastTwoReadyForVolume = recentEval
      .slice(0, 2)
      .every(
        (item) =>
          item.allMetTarget && item.maxRpe !== null && item.maxRpe <= 7,
      );

    if (lastTwoReadyForVolume) {
      const nextReps =
        exercise.trackingType === "reps"
          ? (planItem.targetReps ?? 8) + 2
          : null;
      const nextSeconds =
        exercise.trackingType === "time"
          ? (planItem.targetSeconds ?? 20) + 5
          : null;

      suggestions.push({
        id: `volume-${planItem.planItemId}`,
        type: "increase_volume",
        planItemId: planItem.planItemId,
        dayTitle: planItem.dayTitle,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        title: `Naikkan target: ${exercise.name}`,
        reason:
          "Semua set mencapai target dengan RPE <= 7 pada 2 sesi berturut-turut.",
        actionLabel:
          exercise.trackingType === "reps"
            ? `Naikkan ke ${nextReps} reps`
            : `Naikkan ke ${nextSeconds} dtk`,
        nextExerciseId: exercise.id,
        nextExerciseName: exercise.name,
        nextTargetReps: nextReps,
        nextTargetSeconds: nextSeconds,
      });
    }
  }

  // Aturan 4: Deload setiap 4 minggu latihan aktif
  const activeWeekKeys = new Set(
    sortedSessions.map((session) => getIsoWeekKey(session.sessionDate)),
  );
  if (activeWeekKeys.size >= 4 && activeWeekKeys.size % 4 === 0) {
    suggestions.push({
      id: `deload-week-${activeWeekKeys.size}`,
      type: "deload",
      planItemId: null,
      dayTitle: "Semua Hari Latihan",
      exerciseId: null,
      exerciseName: "Minggu Deload",
      title: `Saran minggu deload (minggu aktif ke-${activeWeekKeys.size})`,
      reason:
        "Anda sudah menyelesaikan 4 minggu latihan. Pertimbangkan minggu ringan dengan volume sekitar 60% untuk pemulihan.",
      actionLabel: "Tandai dipahami",
      nextExerciseId: null,
      nextExerciseName: null,
      nextTargetReps: null,
      nextTargetSeconds: null,
    });
  }

  return suggestions;
}
