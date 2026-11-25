import { z } from "zod";
import { isValidDateString } from "@/lib/date";

export const profileSchema = z.object({
  heightCm: z.coerce
    .number({ error: "Tinggi badan harus berupa angka." })
    .min(100, "Tinggi badan minimal 100 cm.")
    .max(250, "Tinggi badan maksimal 250 cm."),
  birthDate: z
    .string()
    .refine(isValidDateString, "Format tanggal lahir tidak valid."),
  sex: z.enum(["male", "female"], {
    error: "Pilih jenis kelamin yang valid.",
  }),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active"], {
    error: "Pilih level aktivitas yang valid.",
  }),
  startWeightKg: z.coerce
    .number({ error: "Berat awal harus berupa angka." })
    .min(20, "Berat awal minimal 20 kg.")
    .max(300, "Berat awal maksimal 300 kg."),
  targetWeightKg: z.coerce
    .number({ error: "Target berat harus berupa angka." })
    .min(20, "Target berat minimal 20 kg.")
    .max(300, "Target berat maksimal 300 kg."),
  targetDate: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? null : (val ?? null)))
    .refine(
      (val) => val === null || isValidDateString(val),
      "Format target tanggal tidak valid.",
    ),
});

export type ProfileInput = z.infer<typeof profileSchema>;
