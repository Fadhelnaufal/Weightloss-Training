import { z } from "zod";
import { isValidDateString } from "@/lib/date";

const optionalWaistSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (!str) return null;
    return Number(str);
  })
  .refine(
    (val) => val === null || (Number.isFinite(val) && val >= 30 && val <= 250),
    "Lingkar pinggang harus antara 30 sampai 250 cm.",
  );

const optionalNoteSchema = z
  .string()
  .max(500, "Catatan maksimal 500 karakter.")
  .optional()
  .nullable()
  .transform((val) => {
    const trimmed = val?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  });

export const weightLogCreateSchema = z.object({
  logDate: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || isValidDateString(val),
      "Format tanggal log tidak valid.",
    ),
  weightKg: z.coerce
    .number({ error: "Berat badan harus berupa angka." })
    .min(20, "Berat badan minimal 20 kg.")
    .max(300, "Berat badan maksimal 300 kg."),
  waistCm: optionalWaistSchema,
  note: optionalNoteSchema,
});

export const weightLogUpdateSchema = z.object({
  logDate: z
    .string()
    .refine(isValidDateString, "Format tanggal log tidak valid."),
  weightKg: z.coerce
    .number({ error: "Berat badan harus berupa angka." })
    .min(20, "Berat badan minimal 20 kg.")
    .max(300, "Berat badan maksimal 300 kg."),
  waistCm: optionalWaistSchema,
  note: optionalNoteSchema,
});

export type WeightLogCreateInput = z.infer<typeof weightLogCreateSchema>;
export type WeightLogUpdateInput = z.infer<typeof weightLogUpdateSchema>;
