import { z } from "zod";

export const targetUpdateSchema = z.object({
  weeklyLossGoalKg: z.coerce
    .number({ error: "Laju penurunan harus berupa angka." })
    .min(0.1, "Laju penurunan minimal 0,1 kg/minggu.")
    .max(2.0, "Laju penurunan maksimal 2,0 kg/minggu."),
  calorieTarget: z.coerce
    .number({ error: "Target kalori harus berupa angka." })
    .int("Target kalori harus bilangan bulat.")
    .min(800, "Target kalori tidak valid.")
    .max(6000, "Target kalori terlalu tinggi."),
  proteinTargetG: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || String(val).trim() === "") {
        return null;
      }
      return Number(val);
    })
    .refine(
      (val) =>
        val === null || (Number.isInteger(val) && val >= 20 && val <= 400),
      "Target protein harus antara 20 sampai 400 gram.",
    ),
  stepTarget: z.coerce
    .number({ error: "Target langkah harus berupa angka." })
    .int("Target langkah harus bilangan bulat.")
    .min(1000, "Target langkah minimal 1.000.")
    .max(50000, "Target langkah maksimal 50.000."),
});

export type TargetUpdateInput = z.infer<typeof targetUpdateSchema>;
