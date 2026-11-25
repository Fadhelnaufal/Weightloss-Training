import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
]);

export const exerciseCategoryEnum = pgEnum("exercise_category", [
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "core",
  "cardio",
  "mobility",
]);

export const trackingTypeEnum = pgEnum("tracking_type", ["reps", "time"]);

export const dayTypeEnum = pgEnum("day_type", [
  "strength",
  "cardio",
  "circuit",
  "rest",
  "active_rest",
]);

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const profile = pgTable("profile", {
  id: integer("id").primaryKey().default(1),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }).notNull(),
  birthDate: date("birth_date", { mode: "string" }).notNull(),
  sex: sexEnum("sex").notNull(),
  activityLevel: activityLevelEnum("activity_level").notNull(),
  startWeightKg: numeric("start_weight_kg", {
    precision: 5,
    scale: 2,
  }).notNull(),
  targetWeightKg: numeric("target_weight_kg", {
    precision: 5,
    scale: 2,
  }).notNull(),
  targetDate: date("target_date", { mode: "string" }),
  weeklyLossGoalKg: numeric("weekly_loss_goal_kg", {
    precision: 3,
    scale: 2,
  })
    .notNull()
    .default("0.50"),
  calorieTarget: integer("calorie_target"),
  proteinTargetG: integer("protein_target_g"),
  stepTarget: integer("step_target").notNull().default(8000),
  injuryNotes: text("injury_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const weightLogs = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  logDate: date("log_date", { mode: "string" }).notNull().unique(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }).notNull(),
  waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  primaryMuscle: text("primary_muscle").notNull(),
  trackingType: trackingTypeEnum("tracking_type").notNull(),
  difficultyLevel: smallint("difficulty_level").notNull(),
  progressionGroup: text("progression_group").notNull(),
  isLowImpact: boolean("is_low_impact").notNull(),
  instructions: text("instructions").notNull(),
  cues: text("cues"),
  isCustom: boolean("is_custom").notNull().default(false),
});

export const planDays = pgTable("plan_days", {
  id: serial("id").primaryKey(),
  weekday: smallint("weekday").notNull().unique(),
  title: text("title").notNull(),
  dayType: dayTypeEnum("day_type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  note: text("note"),
});

export const planItems = pgTable(
  "plan_items",
  {
    id: serial("id").primaryKey(),
    planDayId: integer("plan_day_id")
      .notNull()
      .references(() => planDays.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id),
    position: smallint("position").notNull(),
    targetSets: smallint("target_sets").notNull(),
    targetReps: smallint("target_reps"),
    targetSeconds: smallint("target_seconds"),
    restSeconds: smallint("rest_seconds").notNull().default(45),
    note: text("note"),
  },
  (table) => [
    index("plan_items_plan_day_position_idx").on(
      table.planDayId,
      table.position,
    ),
  ],
);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: serial("id").primaryKey(),
    sessionDate: date("session_date", { mode: "string" }).notNull(),
    planDayId: integer("plan_day_id").references(() => planDays.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    overallRpe: smallint("overall_rpe"),
    note: text("note"),
  },
  (table) => [index("workout_sessions_session_date_idx").on(table.sessionDate)],
);

export const sessionSets = pgTable(
  "session_sets",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id),
    setNumber: smallint("set_number").notNull(),
    reps: smallint("reps"),
    seconds: smallint("seconds"),
    rpe: smallint("rpe"),
    isCompleted: boolean("is_completed").notNull().default(false),
  },
  (table) => [
    index("session_sets_session_id_idx").on(table.sessionId),
    index("session_sets_exercise_id_idx").on(table.exerciseId),
  ],
);

export type ProfileRow = typeof profile.$inferSelect;
export type NewProfileRow = typeof profile.$inferInsert;
export type WeightLogRow = typeof weightLogs.$inferSelect;
export type NewWeightLogRow = typeof weightLogs.$inferInsert;
export type ExerciseRow = typeof exercises.$inferSelect;
export type PlanDayRow = typeof planDays.$inferSelect;
export type PlanItemRow = typeof planItems.$inferSelect;
export type WorkoutSessionRow = typeof workoutSessions.$inferSelect;
export type SessionSetRow = typeof sessionSets.$inferSelect;

export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  logDate: date("log_date", { mode: "string" }).notNull().unique(),
  steps: integer("steps"),
  sleepHours: numeric("sleep_hours", { precision: 3, scale: 1 }),
  energyScore: smallint("energy_score"),
  note: text("note"),
});

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: serial("id").primaryKey(),
    logDate: date("log_date", { mode: "string" }).notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    description: text("description").notNull(),
    calories: integer("calories").notNull(),
    proteinG: numeric("protein_g", { precision: 5, scale: 1 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("meal_logs_log_date_idx").on(table.logDate)],
);

export type DailyLogRow = typeof dailyLogs.$inferSelect;
export type MealLogRow = typeof mealLogs.$inferSelect;
