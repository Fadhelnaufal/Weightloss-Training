import { z } from "zod";

export const loginSchema = z.object({
  password: z
    .string()
    .min(1, "Password wajib diisi.")
    .max(200, "Password terlalu panjang."),
});

export type LoginInput = z.infer<typeof loginSchema>;
