import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWorkoutStreak,
  evaluateProgressionSuggestions,
  type ExerciseCatalogEntry,
  type FinishedSessionRecord,
  type PlanItemTarget,
  type ScheduleDayRule,
} from "../calc/workout";

const SAMPLE_SCHEDULE: ReadonlyArray<ScheduleDayRule> = [
  { weekday: 1, dayType: "strength", isActive: true }, // Senin
  { weekday: 2, dayType: "cardio", isActive: false }, // Selasa (dijeda pemula)
  { weekday: 3, dayType: "strength", isActive: true }, // Rabu
  { weekday: 4, dayType: "active_rest", isActive: true }, // Kamis
  { weekday: 5, dayType: "circuit", isActive: true }, // Jumat
  { weekday: 6, dayType: "cardio", isActive: false }, // Sabtu (dijeda pemula)
  { weekday: 7, dayType: "rest", isActive: true }, // Minggu
];

test("calculateWorkoutStreak tidak terputus oleh hari rest, active_rest, atau kardio nonaktif", () => {
  // Referensi Rabu 2026-11-25 (sudah selesai), Senin 23 selesai, Jumat 20 selesai
  // Selasa 24 (cardio nonaktif), Minggu 22 (rest), Sabtu 21 (cardio nonaktif) tidak memutus streak.
  const streak = calculateWorkoutStreak(
    ["2026-11-20", "2026-11-23", "2026-11-25"],
    SAMPLE_SCHEDULE,
    "2026-11-25",
  );
  assert.equal(streak, 3);
});

test("calculateWorkoutStreak mempertahankan streak hari sebelumnya jika hari latihan hari ini belum dikerjakan", () => {
  // Referensi Rabu 2026-11-25 (belum selesai), Senin 23 & Jumat 20 sudah selesai
  const streak = calculateWorkoutStreak(
    ["2026-11-20", "2026-11-23"],
    SAMPLE_SCHEDULE,
    "2026-11-25",
  );
  assert.equal(streak, 2);
});

test("calculateWorkoutStreak terputus jika melewatkan hari latihan aktif sebelumnya", () => {
  // Referensi Jumat 2026-11-27 selesai, tetapi Rabu 2026-11-25 terlewat
  const streak = calculateWorkoutStreak(
    ["2026-11-23", "2026-11-27"],
    SAMPLE_SCHEDULE,
    "2026-11-27",
  );
  assert.equal(streak, 1);
});

const SAMPLE_EXERCISES: ReadonlyArray<ExerciseCatalogEntry> = [
  {
    id: 1,
    slug: "push-up-incline",
    name: "Push-up Miring",
    trackingType: "reps",
    difficultyLevel: 2,
    progressionGroup: "push",
    isLowImpact: true,
  },
  {
    id: 2,
    slug: "push-up-knee",
    name: "Push-up Lutut",
    trackingType: "reps",
    difficultyLevel: 3,
    progressionGroup: "push",
    isLowImpact: true,
  },
  {
    id: 3,
    slug: "plank-knee",
    name: "Plank Lutut",
    trackingType: "time",
    difficultyLevel: 1,
    progressionGroup: "plank",
    isLowImpact: true,
  },
];

test("evaluateProgressionSuggestions menyarankan naik reps setelah 2 sesi sukses RPE <= 7", () => {
  const planItems: ReadonlyArray<PlanItemTarget> = [
    {
      planItemId: 10,
      planDayId: 1,
      weekday: 1,
      dayTitle: "Full Body A",
      exerciseId: 1,
      targetSets: 3,
      targetReps: 8,
      targetSeconds: null,
    },
  ];

  const sessions: ReadonlyArray<FinishedSessionRecord> = [
    {
      sessionId: 2,
      sessionDate: "2026-11-25",
      overallRpe: 7,
      sets: [
        { exerciseId: 1, reps: 8, seconds: null, rpe: 7, isCompleted: true },
        { exerciseId: 1, reps: 8, seconds: null, rpe: 7, isCompleted: true },
        { exerciseId: 1, reps: 8, seconds: null, rpe: 7, isCompleted: true },
      ],
    },
    {
      sessionId: 1,
      sessionDate: "2026-11-23",
      overallRpe: 6,
      sets: [
        { exerciseId: 1, reps: 8, seconds: null, rpe: 6, isCompleted: true },
        { exerciseId: 1, reps: 8, seconds: null, rpe: 6, isCompleted: true },
        { exerciseId: 1, reps: 8, seconds: null, rpe: 6, isCompleted: true },
      ],
    },
  ];

  const suggestions = evaluateProgressionSuggestions({
    exercises: SAMPLE_EXERCISES,
    planItems,
    finishedSessions: sessions,
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].type, "increase_volume");
  assert.equal(suggestions[0].nextTargetReps, 10);
});

test("evaluateProgressionSuggestions menyarankan naik varian setelah 3 sesi di batas atas dengan RPE <= 7", () => {
  const planItems: ReadonlyArray<PlanItemTarget> = [
    {
      planItemId: 10,
      planDayId: 1,
      weekday: 1,
      dayTitle: "Full Body A",
      exerciseId: 1,
      targetSets: 3,
      targetReps: 15,
      targetSeconds: null,
    },
  ];

  const makeSession = (
    sessionId: number,
    sessionDate: string,
  ): FinishedSessionRecord => ({
    sessionId,
    sessionDate,
    overallRpe: 7,
    sets: [
      { exerciseId: 1, reps: 15, seconds: null, rpe: 7, isCompleted: true },
      { exerciseId: 1, reps: 15, seconds: null, rpe: 7, isCompleted: true },
      { exerciseId: 1, reps: 15, seconds: null, rpe: 7, isCompleted: true },
    ],
  });

  const suggestions = evaluateProgressionSuggestions({
    exercises: SAMPLE_EXERCISES,
    planItems,
    finishedSessions: [
      makeSession(3, "2026-11-25"),
      makeSession(2, "2026-11-23"),
      makeSession(1, "2026-11-20"),
    ],
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].type, "level_up_variant");
  assert.equal(suggestions[0].nextExerciseId, 2);
  assert.equal(suggestions[0].nextTargetReps, 6);
});

test("evaluateProgressionSuggestions menyarankan turun/tahan jika RPE >= 9 atau set gagal pada 2 sesi berturut-turut", () => {
  const planItems: ReadonlyArray<PlanItemTarget> = [
    {
      planItemId: 11,
      planDayId: 3,
      weekday: 3,
      dayTitle: "Full Body B",
      exerciseId: 2,
      targetSets: 3,
      targetReps: 8,
      targetSeconds: null,
    },
  ];

  const sessions: ReadonlyArray<FinishedSessionRecord> = [
    {
      sessionId: 2,
      sessionDate: "2026-11-25",
      overallRpe: 9,
      sets: [
        { exerciseId: 2, reps: 8, seconds: null, rpe: 9, isCompleted: true },
        { exerciseId: 2, reps: 6, seconds: null, rpe: 9, isCompleted: false },
      ],
    },
    {
      sessionId: 1,
      sessionDate: "2026-11-23",
      overallRpe: 9,
      sets: [
        { exerciseId: 2, reps: 8, seconds: null, rpe: 9, isCompleted: true },
        { exerciseId: 2, reps: 8, seconds: null, rpe: 9, isCompleted: true },
      ],
    },
  ];

  const suggestions = evaluateProgressionSuggestions({
    exercises: SAMPLE_EXERCISES,
    planItems,
    finishedSessions: sessions,
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].type, "regress_or_hold");
  assert.equal(suggestions[0].nextExerciseId, 1);
});
