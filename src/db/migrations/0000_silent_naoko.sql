CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"height_cm" numeric(5, 1) NOT NULL,
	"birth_date" date NOT NULL,
	"sex" "sex" NOT NULL,
	"activity_level" "activity_level" NOT NULL,
	"start_weight_kg" numeric(5, 2) NOT NULL,
	"target_weight_kg" numeric(5, 2) NOT NULL,
	"target_date" date,
	"weekly_loss_goal_kg" numeric(3, 2) DEFAULT '0.50' NOT NULL,
	"calorie_target" integer,
	"protein_target_g" integer,
	"step_target" integer DEFAULT 8000 NOT NULL,
	"injury_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"log_date" date NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"waist_cm" numeric(5, 1),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_logs_log_date_unique" UNIQUE("log_date")
);
