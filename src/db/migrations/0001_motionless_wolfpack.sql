CREATE TYPE "public"."day_type" AS ENUM('strength', 'cardio', 'circuit', 'rest', 'active_rest');--> statement-breakpoint
CREATE TYPE "public"."exercise_category" AS ENUM('push', 'pull', 'squat', 'hinge', 'lunge', 'core', 'cardio', 'mobility');--> statement-breakpoint
CREATE TYPE "public"."tracking_type" AS ENUM('reps', 'time');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" "exercise_category" NOT NULL,
	"primary_muscle" text NOT NULL,
	"tracking_type" "tracking_type" NOT NULL,
	"difficulty_level" smallint NOT NULL,
	"progression_group" text NOT NULL,
	"is_low_impact" boolean NOT NULL,
	"instructions" text NOT NULL,
	"cues" text,
	"is_custom" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "plan_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekday" smallint NOT NULL,
	"title" text NOT NULL,
	"day_type" "day_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	CONSTRAINT "plan_days_weekday_unique" UNIQUE("weekday")
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_day_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"target_sets" smallint NOT NULL,
	"target_reps" smallint,
	"target_seconds" smallint,
	"rest_seconds" smallint DEFAULT 45 NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "session_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"set_number" smallint NOT NULL,
	"reps" smallint,
	"seconds" smallint,
	"rpe" smallint,
	"is_completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_date" date NOT NULL,
	"plan_day_id" integer,
	"title" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_seconds" integer,
	"overall_rpe" smallint,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_day_id_plan_days_id_fk" FOREIGN KEY ("plan_day_id") REFERENCES "public"."plan_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_sets" ADD CONSTRAINT "session_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_plan_day_id_plan_days_id_fk" FOREIGN KEY ("plan_day_id") REFERENCES "public"."plan_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_items_plan_day_position_idx" ON "plan_items" USING btree ("plan_day_id","position");--> statement-breakpoint
CREATE INDEX "session_sets_session_id_idx" ON "session_sets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_sets_exercise_id_idx" ON "session_sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_session_date_idx" ON "workout_sessions" USING btree ("session_date");