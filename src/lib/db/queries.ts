import { asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import {
  dailyLogs,
  exercises,
  mealLogs,
  planDays,
  planItems,
  profile,
  sessionSets,
  weightLogs,
  workoutSessions,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  calculateWorkoutStreak,
  evaluateProgressionSuggestions,
  type ProgressionSuggestion,
} from "@/lib/calc/workout";
import { getIsoWeekday } from "@/lib/date";
import { getDb } from "@/lib/db";

export interface ProfileData {
  id: number;
  heightCm: number;
  birthDate: string;
  sex: "male" | "female";
  activityLevel: "sedentary" | "light" | "moderate" | "active";
  startWeightKg: number;
  targetWeightKg: number;
  targetDate: string | null;
  weeklyLossGoalKg: number;
  calorieTarget: number | null;
  proteinTargetG: number | null;
  stepTarget: number;
  updatedAt: string;
}

export interface MealLogItem {
  id: number;
  logDate: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  calories: number;
  proteinG: number | null;
  createdAt: string;
}

export interface FrequentMealPreset {
  key: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  calories: number;
  proteinG: number | null;
  count: number;
}

export interface DailyLogItem {
  id: number;
  logDate: string;
  steps: number | null;
  sleepHours: number | null;
  energyScore: number | null;
  note: string | null;
}

export interface WeightLogItem {
  id: number;
  logDate: string;
  weightKg: number;
  waistCm: number | null;
  note: string | null;
  createdAt: string;
}

export interface ExerciseItem {
  id: number;
  slug: string;
  name: string;
  category:
    | "push"
    | "pull"
    | "squat"
    | "hinge"
    | "lunge"
    | "core"
    | "cardio"
    | "mobility";
  primaryMuscle: string;
  trackingType: "reps" | "time";
  difficultyLevel: number;
  progressionGroup: string;
  isLowImpact: boolean;
  instructions: string;
  cues: string | null;
  isCustom: boolean;
}

export interface PlanItemWithExercise {
  id: number;
  planDayId: number;
  exerciseId: number;
  position: number;
  targetSets: number;
  targetReps: number | null;
  targetSeconds: number | null;
  restSeconds: number;
  note: string | null;
  exercise: ExerciseItem;
}

export interface PlanDayWithItems {
  id: number;
  weekday: number;
  title: string;
  dayType: "strength" | "cardio" | "circuit" | "rest" | "active_rest";
  isActive: boolean;
  note: string | null;
  items: PlanItemWithExercise[];
}

export interface WorkoutSetItem {
  id: number;
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  reps: number | null;
  seconds: number | null;
  rpe: number | null;
  isCompleted: boolean;
  exercise: ExerciseItem;
}

export interface WorkoutSessionDetail {
  id: number;
  sessionDate: string;
  planDayId: number | null;
  title: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  overallRpe: number | null;
  note: string | null;
  sets: WorkoutSetItem[];
  restByExerciseId: Record<number, number>;
}

export interface ExerciseProgressSessionPoint {
  sessionId: number;
  sessionDate: string;
  sessionTitle: string;
  bestValue: number;
  trackingType: "reps" | "time";
}

export interface ExerciseProgressSummary {
  exercise: ExerciseItem;
  points: ExerciseProgressSessionPoint[];
}

function mapProfileRow(row: typeof profile.$inferSelect): ProfileData {
  return {
    id: row.id,
    heightCm: Number(row.heightCm),
    birthDate: row.birthDate,
    sex: row.sex,
    activityLevel: row.activityLevel,
    startWeightKg: Number(row.startWeightKg),
    targetWeightKg: Number(row.targetWeightKg),
    targetDate: row.targetDate,
    weeklyLossGoalKg: Number(row.weeklyLossGoalKg),
    calorieTarget: row.calorieTarget,
    proteinTargetG: row.proteinTargetG,
    stepTarget: row.stepTarget,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapWeightLogRow(row: typeof weightLogs.$inferSelect): WeightLogItem {
  return {
    id: row.id,
    logDate: row.logDate,
    weightKg: Number(row.weightKg),
    waistCm: row.waistCm !== null ? Number(row.waistCm) : null,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getProfile(): Promise<ProfileData | null> {
  await requireSession();
  const db = getDb();
  const rows = await db
    .select()
    .from(profile)
    .where(eq(profile.id, 1))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return mapProfileRow(rows[0]);
}

export async function getWeightLogs(): Promise<WeightLogItem[]> {
  await requireSession();
  const db = getDb();
  const rows = await db
    .select()
    .from(weightLogs)
    .orderBy(desc(weightLogs.logDate), desc(weightLogs.id));

  return rows.map(mapWeightLogRow);
}

export async function getExercises(): Promise<ExerciseItem[]> {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(exercises)
    .orderBy(
      asc(exercises.category),
      asc(exercises.progressionGroup),
      asc(exercises.difficultyLevel),
      asc(exercises.name),
    );
}

export async function getPlanDaysWithItems(): Promise<PlanDayWithItems[]> {
  await requireSession();
  const db = getDb();

  const [days, itemRows, exerciseRows] = await Promise.all([
    db.select().from(planDays).orderBy(asc(planDays.weekday)),
    db.select().from(planItems).orderBy(asc(planItems.position), asc(planItems.id)),
    db.select().from(exercises),
  ]);

  const exerciseById = new Map(exerciseRows.map((ex) => [ex.id, ex]));
  const itemsByDayId = new Map<number, PlanItemWithExercise[]>();

  for (const row of itemRows) {
    const exercise = exerciseById.get(row.exerciseId);
    if (!exercise) continue;
    const list = itemsByDayId.get(row.planDayId) ?? [];
    list.push({
      id: row.id,
      planDayId: row.planDayId,
      exerciseId: row.exerciseId,
      position: row.position,
      targetSets: row.targetSets,
      targetReps: row.targetReps,
      targetSeconds: row.targetSeconds,
      restSeconds: row.restSeconds,
      note: row.note,
      exercise,
    });
    itemsByDayId.set(row.planDayId, list);
  }

  return days.map((day) => ({
    id: day.id,
    weekday: day.weekday,
    title: day.title,
    dayType: day.dayType,
    isActive: day.isActive,
    note: day.note,
    items: itemsByDayId.get(day.id) ?? [],
  }));
}

export async function getActiveWorkoutSession(): Promise<WorkoutSessionDetail | null> {
  await requireSession();
  const db = getDb();

  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(isNull(workoutSessions.finishedAt))
    .orderBy(desc(workoutSessions.startedAt), desc(workoutSessions.id))
    .limit(1);

  if (!session) {
    return null;
  }

  const [setRows, exerciseRows, planItemRows] = await Promise.all([
    db
      .select()
      .from(sessionSets)
      .where(eq(sessionSets.sessionId, session.id))
      .orderBy(asc(sessionSets.id)),
    db.select().from(exercises),
    session.planDayId
      ? db
          .select()
          .from(planItems)
          .where(eq(planItems.planDayId, session.planDayId))
      : Promise.resolve([]),
  ]);

  const exerciseById = new Map(exerciseRows.map((ex) => [ex.id, ex]));
  const restByExerciseId: Record<number, number> = {};
  for (const item of planItemRows) {
    restByExerciseId[item.exerciseId] = item.restSeconds;
  }

  const mappedSets: WorkoutSetItem[] = [];
  for (const row of setRows) {
    const exercise = exerciseById.get(row.exerciseId);
    if (!exercise) continue;
    mappedSets.push({
      id: row.id,
      sessionId: row.sessionId,
      exerciseId: row.exerciseId,
      setNumber: row.setNumber,
      reps: row.reps,
      seconds: row.seconds,
      rpe: row.rpe,
      isCompleted: row.isCompleted,
      exercise,
    });
  }

  return {
    id: session.id,
    sessionDate: session.sessionDate,
    planDayId: session.planDayId,
    title: session.title,
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
    durationSeconds: session.durationSeconds,
    overallRpe: session.overallRpe,
    note: session.note,
    sets: mappedSets,
    restByExerciseId,
  };
}

export async function getFinishedWorkoutSessions(): Promise<
  WorkoutSessionDetail[]
> {
  await requireSession();
  const db = getDb();

  const [sessions, allSets, exerciseRows] = await Promise.all([
    db
      .select()
      .from(workoutSessions)
      .where(isNotNull(workoutSessions.finishedAt))
      .orderBy(desc(workoutSessions.sessionDate), desc(workoutSessions.id)),
    db.select().from(sessionSets).orderBy(asc(sessionSets.id)),
    db.select().from(exercises),
  ]);

  const exerciseById = new Map(exerciseRows.map((ex) => [ex.id, ex]));
  const setsBySessionId = new Map<number, WorkoutSetItem[]>();

  for (const row of allSets) {
    const exercise = exerciseById.get(row.exerciseId);
    if (!exercise) continue;
    const list = setsBySessionId.get(row.sessionId) ?? [];
    list.push({
      id: row.id,
      sessionId: row.sessionId,
      exerciseId: row.exerciseId,
      setNumber: row.setNumber,
      reps: row.reps,
      seconds: row.seconds,
      rpe: row.rpe,
      isCompleted: row.isCompleted,
      exercise,
    });
    setsBySessionId.set(row.sessionId, list);
  }

  return sessions.map((session) => ({
    id: session.id,
    sessionDate: session.sessionDate,
    planDayId: session.planDayId,
    title: session.title,
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
    durationSeconds: session.durationSeconds,
    overallRpe: session.overallRpe,
    note: session.note,
    sets: setsBySessionId.get(session.id) ?? [],
    restByExerciseId: {},
  }));
}

export function buildExerciseProgressSummaries(
  finishedSessions: ReadonlyArray<WorkoutSessionDetail>,
): ExerciseProgressSummary[] {
  const byExerciseId = new Map<
    number,
    { exercise: ExerciseItem; points: ExerciseProgressSessionPoint[] }
  >();

  // Urutkan kronologis menaik untuk grafik progres
  const chronological = [...finishedSessions].sort(
    (a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.id - b.id,
  );

  for (const session of chronological) {
    const bestPerExercise = new Map<number, { exercise: ExerciseItem; best: number }>();

    for (const setItem of session.sets) {
      if (!setItem.isCompleted) continue;
      const value =
        setItem.exercise.trackingType === "reps"
          ? (setItem.reps ?? 0)
          : (setItem.seconds ?? 0);
      if (value <= 0) continue;

      const current = bestPerExercise.get(setItem.exerciseId);
      if (!current || value > current.best) {
        bestPerExercise.set(setItem.exerciseId, {
          exercise: setItem.exercise,
          best: value,
        });
      }
    }

    for (const [exerciseId, info] of bestPerExercise.entries()) {
      const entry = byExerciseId.get(exerciseId) ?? {
        exercise: info.exercise,
        points: [],
      };
      entry.points.push({
        sessionId: session.id,
        sessionDate: session.sessionDate,
        sessionTitle: session.title,
        bestValue: info.best,
        trackingType: info.exercise.trackingType,
      });
      byExerciseId.set(exerciseId, entry);
    }
  }

  return Array.from(byExerciseId.values()).sort((a, b) =>
    a.exercise.name.localeCompare(b.exercise.name, "id"),
  );
}

export async function getProgressionSuggestions(): Promise<
  ProgressionSuggestion[]
> {
  await requireSession();
  const [exerciseList, planDaysList, finishedSessions] = await Promise.all([
    getExercises(),
    getPlanDaysWithItems(),
    getFinishedWorkoutSessions(),
  ]);

  const flatPlanItems = planDaysList.flatMap((day) =>
    day.items.map((item) => ({
      planItemId: item.id,
      planDayId: day.id,
      weekday: day.weekday,
      dayTitle: day.title,
      exerciseId: item.exerciseId,
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      targetSeconds: item.targetSeconds,
    })),
  );

  return evaluateProgressionSuggestions({
    exercises: exerciseList,
    planItems: flatPlanItems,
    finishedSessions: finishedSessions.map((session) => ({
      sessionId: session.id,
      sessionDate: session.sessionDate,
      overallRpe: session.overallRpe,
      sets: session.sets.map((s) => ({
        exerciseId: s.exerciseId,
        reps: s.reps,
        seconds: s.seconds,
        rpe: s.rpe,
        isCompleted: s.isCompleted,
      })),
    })),
  });
}

export async function getWorkoutOverview(todayDateWIB: string) {
  await requireSession();
  const [planDaysList, finishedSessions, activeSession, exerciseList] =
    await Promise.all([
      getPlanDaysWithItems(),
      getFinishedWorkoutSessions(),
      getActiveWorkoutSession(),
      getExercises(),
    ]);

  const todayWeekday = getIsoWeekday(todayDateWIB);
  const todayPlan =
    planDaysList.find((day) => day.weekday === todayWeekday) ?? null;

  const completedToday = finishedSessions.some(
    (s) => s.sessionDate === todayDateWIB,
  );

  const streakDays = calculateWorkoutStreak(
    finishedSessions.map((s) => s.sessionDate),
    planDaysList.map((day) => ({
      weekday: day.weekday,
      dayType: day.dayType,
      isActive: day.isActive,
    })),
    todayDateWIB,
  );

  const flatPlanItems = planDaysList.flatMap((day) =>
    day.items.map((item) => ({
      planItemId: item.id,
      planDayId: day.id,
      weekday: day.weekday,
      dayTitle: day.title,
      exerciseId: item.exerciseId,
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      targetSeconds: item.targetSeconds,
    })),
  );

  const suggestions = evaluateProgressionSuggestions({
    exercises: exerciseList,
    planItems: flatPlanItems,
    finishedSessions: finishedSessions.map((session) => ({
      sessionId: session.id,
      sessionDate: session.sessionDate,
      overallRpe: session.overallRpe,
      sets: session.sets.map((s) => ({
        exerciseId: s.exerciseId,
        reps: s.reps,
        seconds: s.seconds,
        rpe: s.rpe,
        isCompleted: s.isCompleted,
      })),
    })),
  });

  return {
    todayPlan,
    completedToday,
    activeSession,
    streakDays,
    suggestions,
  };
}

export async function getMealLogs(logDate?: string): Promise<MealLogItem[]> {
  await requireSession();
  const db = getDb();

  const rows = logDate
    ? await db
        .select()
        .from(mealLogs)
        .where(eq(mealLogs.logDate, logDate))
        .orderBy(desc(mealLogs.createdAt), desc(mealLogs.id))
    : await db
        .select()
        .from(mealLogs)
        .orderBy(
          desc(mealLogs.logDate),
          desc(mealLogs.createdAt),
          desc(mealLogs.id),
        );

  return rows.map((row) => ({
    id: row.id,
    logDate: row.logDate,
    mealType: row.mealType,
    description: row.description,
    calories: row.calories,
    proteinG: row.proteinG !== null ? Number(row.proteinG) : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export function computeFrequentMealPresets(
  logs: ReadonlyArray<MealLogItem>,
  limit: number = 8,
): FrequentMealPreset[] {
  const grouped = new Map<
    string,
    FrequentMealPreset & { lastCreatedAt: string }
  >();

  for (const item of logs) {
    const normalizedDesc = item.description.trim().toLowerCase();
    const key = `${item.mealType}::${normalizedDesc}::${item.calories}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        key,
        mealType: item.mealType,
        description: item.description.trim(),
        calories: item.calories,
        proteinG: item.proteinG,
        count: 1,
        lastCreatedAt: item.createdAt,
      });
    } else {
      existing.count += 1;
      if (item.createdAt > existing.lastCreatedAt) {
        existing.lastCreatedAt = item.createdAt;
        existing.description = item.description.trim();
        existing.proteinG = item.proteinG;
      }
    }
  }

  return Array.from(grouped.values())
    .sort(
      (a, b) =>
        b.count - a.count || b.lastCreatedAt.localeCompare(a.lastCreatedAt),
    )
    .slice(0, limit)
    .map((entry) => ({
      key: entry.key,
      mealType: entry.mealType,
      description: entry.description,
      calories: entry.calories,
      proteinG: entry.proteinG,
      count: entry.count,
    }));
}

export async function getDailyLogs(): Promise<DailyLogItem[]> {
  await requireSession();
  const db = getDb();
  const rows = await db
    .select()
    .from(dailyLogs)
    .orderBy(desc(dailyLogs.logDate), desc(dailyLogs.id));

  return rows.map((row) => ({
    id: row.id,
    logDate: row.logDate,
    steps: row.steps,
    sleepHours: row.sleepHours !== null ? Number(row.sleepHours) : null,
    energyScore: row.energyScore,
    note: row.note,
  }));
}

export async function getTodayDailyAndMealSummary(todayDateWIB: string) {
  await requireSession();
  const db = getDb();

  const [todayMeals, [todayDaily]] = await Promise.all([
    db
      .select()
      .from(mealLogs)
      .where(eq(mealLogs.logDate, todayDateWIB)),
    db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.logDate, todayDateWIB))
      .limit(1),
  ]);

  const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  const totalProteinG =
    Math.round(
      todayMeals.reduce(
        (sum, m) => sum + (m.proteinG !== null ? Number(m.proteinG) : 0),
        0,
      ) * 10,
    ) / 10;

  return {
    totalCalories,
    totalProteinG,
    mealsCount: todayMeals.length,
    steps: todayDaily?.steps ?? null,
    sleepHours:
      todayDaily?.sleepHours !== null && todayDaily?.sleepHours !== undefined
        ? Number(todayDaily.sleepHours)
        : null,
    energyScore: todayDaily?.energyScore ?? null,
  };
}
