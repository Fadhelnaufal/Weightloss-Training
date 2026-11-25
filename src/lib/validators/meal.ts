import { z } from "zod";
import { isValidDateString } from "@/lib/date";

const optionalProteinSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return null;
    }
    return Number(val);
  })
  .refine(
    (val) => val === null || (Number.isFinite(val) && val >= 0 && val <= 500),
    "Protein harus antara 0 sampai 500 gram.",
  );

export const mealLogCreateSchema = z.object({
  logDate: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || isValidDateString(val),
      "Format tanggal log makanan tidak valid.",
    ),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"], {
    error: "Pilih waktu makan yang valid.",
  }),
  description: z
    .string()
    .trim()
    .min(1, "Deskripsi makanan wajib diisi.")
    .max(200, "Deskripsi maksimal 200 karakter."),
  calories: z.coerce
    .number({ error: "Kalori harus berupa angka." })
    .int("Kalori harus bilangan bulat.")
    .min(0, "Kalori minimal 0 kkal.")
    .max(5000, "Kalori per entri maksimal 5000 kkal."),
  proteinG: optionalProteinSchema,
});

export const mealLogUpdateSchema = mealLogCreateSchema.extend({
  logDate: z
    .string()
    .refine(isValidDateString, "Format tanggal log makanan tidak valid."),
});

export type MealLogCreateInput = z.infer<typeof mealLogCreateSchema>;
export type MealLogUpdateInput = z.infer<typeof mealLogUpdateSchema>;
