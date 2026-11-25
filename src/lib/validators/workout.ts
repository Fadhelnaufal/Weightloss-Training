import { z } from "zod";
import { isValidDateString } from "@/lib/date";

export const startWorkoutSchema = z.object({
  mode: z.enum(["plan", "free"]),
  planDayId: z.coerce.number().int().positive().nullable().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Judul sesi wajib diisi.")
    .max(120, "Judul sesi maksimal 120 karakter.")
    .optional(),
  sessionDate: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || isValidDateString(val),
      "Tanggal sesi tidak valid.",
    ),
  freeExercises: z
    .array(
      z.object({
        exerciseId: z.coerce.number().int().positive(),
        sets: z.coerce.number().int().min(1).max(10),
        targetReps: z.number().int().min(1).max(200).nullable().optional(),
        targetSeconds: z.number().int().min(5).max(600).nullable().optional(),
      }),
    )
    .optional(),
});

export const updateSessionSetSchema = z.object({
  reps: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || String(val).trim() === "") {
        return null;
      }
      return Number(val);
    })
    .refine(
      (val) => val === null || (Number.isInteger(val) && val >= 0 && val <= 500),
      "Reps harus antara 0 sampai 500.",
    ),
  seconds: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || String(val).trim() === "") {
        return null;
      }
      return Number(val);
    })
    .refine(
      (val) => val === null || (Number.isInteger(val) && val >= 0 && val <= 3600),
      "Durasi harus antara 0 sampai 3600 detik.",
    ),
  rpe: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || String(val).trim() === "") {
        return null;
      }
      return Number(val);
    })
    .refine(
      (val) => val === null || (Number.isInteger(val) && val >= 1 && val <= 10),
      "RPE harus antara 1 sampai 10.",
    ),
  isCompleted: z.boolean(),
});

export const swapSetExerciseSchema = z.object({
  fromExerciseId: z.coerce.number().int().positive(),
  toExerciseId: z.coerce.number().int().positive(),
});

export const finishWorkoutSchema = z.object({
  overallRpe: z.coerce
    .number({ error: "RPE keseluruhan wajib diisi (1-10)." })
    .int()
    .min(1, "RPE minimal 1.")
    .max(10, "RPE maksimal 10."),
  note: z
    .string()
    .max(500, "Catatan maksimal 500 karakter.")
    .nullable()
    .optional()
    .transform((val) => {
      const trimmed = val?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : null;
    }),
});
