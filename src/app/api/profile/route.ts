import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { profile } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { resolveSafeCalorieTarget } from "@/lib/calc";
import { todayWIB } from "@/lib/date";
import { getDb } from "@/lib/db";
import { getProfile, getWeightLogs } from "@/lib/db/queries";
import { profileSchema } from "@/lib/validators/profile";

export async function GET() {
  try {
    const data = await getProfile();
    return NextResponse.json({ profile: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Gagal mengambil data profil." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
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

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data profil tidak valid.",
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const now = new Date();
  const db = getDb();

  try {
    const [existingProfile, weightList] = await Promise.all([
      db.select().from(profile).where(eq(profile.id, 1)).limit(1),
      getWeightLogs(),
    ]);

    const currentStoredCalorieTarget = existingProfile[0]?.calorieTarget ?? null;
    const referenceWeight = weightList[0]?.weightKg ?? data.startWeightKg;
    const safeTarget = resolveSafeCalorieTarget({
      storedCalorieTarget: currentStoredCalorieTarget,
      weightKg: referenceWeight,
      heightCm: data.heightCm,
      birthDate: data.birthDate,
      sex: data.sex,
      referenceDate: todayWIB(),
    });

    const [saved] = await db
      .insert(profile)
      .values({
        id: 1,
        heightCm: data.heightCm.toFixed(1),
        birthDate: data.birthDate,
        sex: data.sex,
        activityLevel: data.activityLevel,
        startWeightKg: data.startWeightKg.toFixed(2),
        targetWeightKg: data.targetWeightKg.toFixed(2),
        targetDate: data.targetDate,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: profile.id,
        set: {
          heightCm: data.heightCm.toFixed(1),
          birthDate: data.birthDate,
          sex: data.sex,
          activityLevel: data.activityLevel,
          startWeightKg: data.startWeightKg.toFixed(2),
          targetWeightKg: data.targetWeightKg.toFixed(2),
          targetDate: data.targetDate,
          ...(safeTarget.wasAdjustedToBmr &&
          safeTarget.effectiveCalorieTarget !== null
            ? { calorieTarget: safeTarget.effectiveCalorieTarget }
            : {}),
          updatedAt: now,
        },
      })
      .returning();

    return NextResponse.json({
      adjustedCalorieTargetToBmr: safeTarget.wasAdjustedToBmr,
      profile: {
        id: saved.id,
        heightCm: Number(saved.heightCm),
        birthDate: saved.birthDate,
        sex: saved.sex,
        activityLevel: saved.activityLevel,
        startWeightKg: Number(saved.startWeightKg),
        targetWeightKg: Number(saved.targetWeightKg),
        targetDate: saved.targetDate,
        updatedAt: saved.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan profil ke database." },
      { status: 500 },
    );
  }
}
