import { isValidDateString, shiftDateString } from "./date";

export type BiologicalSex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const KCAL_PER_KG_FAT = 7700;
export const RECOMMENDED_WEEKLY_LOSS_MIN = 0.25;
export const RECOMMENDED_WEEKLY_LOSS_MAX = 0.75;
export const AGGRESSIVE_WEEKLY_LOSS_THRESHOLD = 1.0;

export const MEDICAL_DISCLAIMER =
  "Alat bantu pencatatan, bukan pengganti saran dokter atau ahli gizi.";

/**
 * Menghitung usia dalam tahun penuh berdasarkan string tanggal lahir 'YYYY-MM-DD'
 * dan tanggal referensi 'YYYY-MM-DD' (tanpa konversi UTC).
 */
export function calculateAgeYears(
  birthDate: string,
  referenceDate: string,
): number {
  if (!isValidDateString(birthDate) || !isValidDateString(referenceDate)) {
    throw new Error("Format tanggal lahir atau referensi tidak valid.");
  }

  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [refYear, refMonth, refDay] = referenceDate.split("-").map(Number);

  let age = refYear - birthYear;
  if (
    refMonth < birthMonth ||
    (refMonth === birthMonth && refDay < birthDay)
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

/**
 * Menghitung BMR dengan rumus Mifflin-St Jeor (BRIEF.md bagian 5):
 * - Pria:   10*berat(kg) + 6.25*tinggi(cm) - 5*usia + 5
 * - Wanita: 10*berat(kg) + 6.25*tinggi(cm) - 5*usia - 161
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
}): number {
  const { weightKg, heightCm, ageYears, sex } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

/**
 * Menghitung TDEE = BMR x faktor aktivitas.
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export interface CalorieTargetCalculationInput {
  weightKg: number;
  heightCm: number;
  birthDate: string;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
  targetWeightKg: number;
  weeklyLossGoalKg: number;
  referenceDate: string;
}

export interface CalorieTargetCalculationResult {
  ageYears: number;
  bmr: number;
  tdee: number;
  requestedDailyDeficit: number;
  rawTargetCalories: number;
  recommendedCalories: number;
  isClampedToBmr: boolean;
  bmrFloorNotice: string | null;
  isAggressiveRate: boolean;
  rateWarning: string | null;
  effectiveDailyDeficit: number;
  effectiveWeeklyLossKg: number;
  estimatedTargetDate: string | null;
  estimatedWeeks: number | null;
  disclaimer: string;
}

/**
 * Menghitung BMR, TDEE, saran target kalori, serta guardrails sesuai BRIEF.md bagian 5.
 * Target kalori tidak pernah di bawah BMR; jika hasil hitung lebih rendah, pakai BMR.
 */
export function calculateCaloriePlan(
  input: CalorieTargetCalculationInput,
): CalorieTargetCalculationResult {
  const ageYears = calculateAgeYears(input.birthDate, input.referenceDate);
  const rawBmr = calculateBMR({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    ageYears,
    sex: input.sex,
  });
  const bmr = Math.round(rawBmr);
  const tdee = Math.round(calculateTDEE(rawBmr, input.activityLevel));

  const requestedDailyDeficit = Math.round(
    (input.weeklyLossGoalKg * KCAL_PER_KG_FAT) / 7,
  );
  const rawTargetCalories = tdee - requestedDailyDeficit;

  const isClampedToBmr = rawTargetCalories < bmr;
  const recommendedCalories = isClampedToBmr ? bmr : rawTargetCalories;

  const bmrFloorNotice = isClampedToBmr
    ? `Hasil hitung (${rawTargetCalories} kkal) berada di bawah BMR (${bmr} kkal). Sesuai batas aman, target kalori disesuaikan menjadi ${bmr} kkal (nilai BMR).`
    : null;

  const isAggressiveRate =
    input.weeklyLossGoalKg > AGGRESSIVE_WEEKLY_LOSS_THRESHOLD;
  const rateWarning = isAggressiveRate
    ? `Peringatan: laju penurunan ${input.weeklyLossGoalKg.toFixed(2)} kg/minggu melebihi batas aman (~1 kg/minggu). Laju yang disarankan adalah ${RECOMMENDED_WEEKLY_LOSS_MIN}-${RECOMMENDED_WEEKLY_LOSS_MAX} kg/minggu.`
    : null;

  const effectiveDailyDeficit = Math.max(0, tdee - recommendedCalories);
  const effectiveWeeklyLossKg =
    Math.round(((effectiveDailyDeficit * 7) / KCAL_PER_KG_FAT) * 100) / 100;

  let estimatedTargetDate: string | null = null;
  let estimatedWeeks: number | null = null;

  if (input.weightKg <= input.targetWeightKg) {
    estimatedTargetDate = input.referenceDate;
    estimatedWeeks = 0;
  } else if (effectiveDailyDeficit > 0) {
    const kgToLose = input.weightKg - input.targetWeightKg;
    const totalDays = Math.ceil(
      (kgToLose * KCAL_PER_KG_FAT) / effectiveDailyDeficit,
    );
    estimatedTargetDate = shiftDateString(input.referenceDate, totalDays);
    estimatedWeeks = Math.round((totalDays / 7) * 10) / 10;
  }

  return {
    ageYears,
    bmr,
    tdee,
    requestedDailyDeficit,
    rawTargetCalories,
    recommendedCalories,
    isClampedToBmr,
    bmrFloorNotice,
    isAggressiveRate,
    rateWarning,
    effectiveDailyDeficit,
    effectiveWeeklyLossKg,
    estimatedTargetDate,
    estimatedWeeks,
    disclaimer: MEDICAL_DISCLAIMER,
  };
}

/**
 * Memastikan target kalori tersimpan tidak pernah berada di bawah BMR saat ini
 * meskipun berat badan atau data profil berubah setelah target disimpan.
 */
export function resolveSafeCalorieTarget(params: {
  storedCalorieTarget: number | null;
  weightKg: number;
  heightCm: number;
  birthDate: string;
  sex: BiologicalSex;
  referenceDate: string;
}): {
  bmr: number;
  effectiveCalorieTarget: number | null;
  wasAdjustedToBmr: boolean;
} {
  const ageYears = calculateAgeYears(params.birthDate, params.referenceDate);
  const bmr = Math.round(
    calculateBMR({
      weightKg: params.weightKg,
      heightCm: params.heightCm,
      ageYears,
      sex: params.sex,
    }),
  );

  if (params.storedCalorieTarget === null) {
    return {
      bmr,
      effectiveCalorieTarget: null,
      wasAdjustedToBmr: false,
    };
  }

  if (params.storedCalorieTarget < bmr) {
    return {
      bmr,
      effectiveCalorieTarget: bmr,
      wasAdjustedToBmr: true,
    };
  }

  return {
    bmr,
    effectiveCalorieTarget: params.storedCalorieTarget,
    wasAdjustedToBmr: false,
  };
}
