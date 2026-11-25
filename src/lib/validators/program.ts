import { z } from "zod";

export const planDayUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul hari wajib diisi.")
    .max(100, "Judul hari maksimal 100 karakter."),
  dayType: z.enum(["strength", "cardio", "circuit", "rest", "active_rest"], {
    error: "Jenis hari tidak valid.",
  }),
  isActive: z.boolean().optional(),
  note: z
    .string()
    .max(500, "Catatan maksimal 500 karakter.")
    .nullable()
    .optional()
    .transform((val) => {
      const trimmed = val?.trim() ?? "";
      return trimmed.length > 0 ? trimmed : null;
    }),
  items: z.array(
    z.object({
      exerciseId: z.coerce
        .number({ error: "Gerakan tidak valid." })
        .int()
        .positive(),
      targetSets: z.coerce
        .number({ error: "Jumlah set harus angka." })
        .int()
        .min(1, "Minimal 1 set.")
        .max(12, "Maksimal 12 set."),
      targetReps: z
        .union([z.number(), z.string(), z.null(), z.undefined()])
        .transform((val) => {
          if (val === null || val === undefined || String(val).trim() === "") {
            return null;
          }
          return Number(val);
        })
        .refine(
          (val) => val === null || (Number.isInteger(val) && val >= 1 && val <= 200),
          "Target reps harus 1 sampai 200.",
        ),
      targetSeconds: z
        .union([z.number(), z.string(), z.null(), z.undefined()])
        .transform((val) => {
          if (val === null || val === undefined || String(val).trim() === "") {
            return null;
          }
          return Number(val);
        })
        .refine(
          (val) => val === null || (Number.isInteger(val) && val >= 5 && val <= 600),
          "Target detik harus 5 sampai 600.",
        ),
      restSeconds: z.coerce
        .number({ error: "Durasi istirahat harus angka." })
        .int()
        .min(0, "Istirahat minimal 0 detik.")
        .max(300, "Istirahat maksimal 300 detik."),
      note: z
        .string()
        .max(200, "Catatan gerakan maksimal 200 karakter.")
        .nullable()
        .optional()
        .transform((val) => {
          const trimmed = val?.trim() ?? "";
          return trimmed.length > 0 ? trimmed : null;
        }),
    }),
  ),
});

export const cardioToggleSchema = z.object({
  enabled: z.boolean(),
});

export const applyProgressionSchema = z.object({
  planItemId: z.coerce.number().int().positive(),
  exerciseId: z.coerce.number().int().positive(),
  targetReps: z.number().int().min(1).max(200).nullable(),
  targetSeconds: z.number().int().min(5).max(600).nullable(),
});
