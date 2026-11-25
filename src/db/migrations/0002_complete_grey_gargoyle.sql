CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"log_date" date NOT NULL,
	"steps" integer,
	"sleep_hours" numeric(3, 1),
	"energy_score" smallint,
	"note" text,
	CONSTRAINT "daily_logs_log_date_unique" UNIQUE("log_date")
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"log_date" date NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"description" text NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" numeric(5, 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "meal_logs_log_date_idx" ON "meal_logs" USING btree ("log_date");