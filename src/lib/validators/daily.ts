import { z } from "zod";
import { isValidDateString } from "@/lib/date";

const optionalStepsSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return null;
    }
    return Number(val);
  })
  .refine(
    (val) =>
      val === null || (Number.isInteger(val) && val >= 0 && val <= 200000),
    "Langkah harus bilangan bulat antara 0 sampai 200.000.",
  );

const optionalSleepSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return null;
    }
    return Number(val);
  })
  .refine(
    (val) => val === null || (Number.isFinite(val) && val >= 0 && val <= 24),
    "Jam tidur harus antara 0 sampai 24 jam.",
  );

const optionalEnergySchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return null;
    }
    return Number(val);
  })
  .refine(
    (val) => val === null || (Number.isInteger(val) && val >= 1 && val <= 5),
    "Skor energi harus antara 1 sampai 5.",
  );

export const dailyLogUpsertSchema = z.object({
  logDate: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || isValidDateString(val),
      "Format tanggal log harian tidak valid.",
    ),
  steps: optionalStepsSchema,
  sleepHours: optionalSleepSchema,
  energyScore: optionalEnergySchema,
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

export type DailyLogUpsertInput = z.infer<typeof dailyLogUpsertSchema>;
