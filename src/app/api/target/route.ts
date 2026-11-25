import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { profile } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { calculateAgeYears, calculateBMR } from "@/lib/calc";
import { todayWIB } from "@/lib/date";
import { getDb } from "@/lib/db";
import { getProfile, getWeightLogs } from "@/lib/db/queries";
import { targetUpdateSchema } from "@/lib/validators/target";

export async function POST(request: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const parsed = targetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data target tidak valid.",
      },
      { status: 400 },
    );
  }

  const [existingProfile, weightList] = await Promise.all([
    getProfile(),
    getWeightLogs(),
  ]);

  if (!existingProfile) {
    return NextResponse.json(
      { error: "Isi profil terlebih dahulu sebelum menyimpan target." },
      { status: 400 },
    );
  }

  const referenceWeight =
    weightList[0]?.weightKg ?? existingProfile.startWeightKg;
  const ageYears = calculateAgeYears(existingProfile.birthDate, todayWIB());
  const bmr = Math.round(
    calculateBMR({
      weightKg: referenceWeight,
      heightCm: existingProfile.heightCm,
      ageYears,
      sex: existingProfile.sex,
    }),
  );

  if (parsed.data.calorieTarget < bmr) {
    return NextResponse.json(
      {
        error: `Target kalori (${parsed.data.calorieTarget} kkal) tidak boleh di bawah BMR Anda (${bmr} kkal).`,
      },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    await db
      .update(profile)
      .set({
        weeklyLossGoalKg: parsed.data.weeklyLossGoalKg.toFixed(2),
        calorieTarget: parsed.data.calorieTarget,
        proteinTargetG: parsed.data.proteinTargetG,
        stepTarget: parsed.data.stepTarget,
        updatedAt: new Date(),
      })
      .where(eq(profile.id, 1));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan target ke profil." },
      { status: 500 },
    );
  }
}
