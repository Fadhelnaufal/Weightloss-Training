import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAgeYears,
  calculateBMR,
  calculateCaloriePlan,
  calculateTDEE,
  MEDICAL_DISCLAIMER,
  resolveSafeCalorieTarget,
} from "../calc";

test("calculateAgeYears menghitung usia penuh secara akurat tanpa pergeseran UTC", () => {
  assert.equal(calculateAgeYears("1995-11-26", "2026-11-25"), 30);
  assert.equal(calculateAgeYears("1995-11-25", "2026-11-25"), 31);
});

test("calculateBMR dan calculateTDEE mengikuti rumus Mifflin-St Jeor", () => {
  // Pria: 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
  const bmrMale = calculateBMR({
    weightKg: 80,
    heightCm: 175,
    ageYears: 30,
    sex: "male",
  });
  assert.equal(bmrMale, 1748.75);

  // Wanita: 10*60 + 6.25*160 - 5*28 - 161 = 600 + 1000 - 140 - 161 = 1299
  const bmrFemale = calculateBMR({
    weightKg: 60,
    heightCm: 160,
    ageYears: 28,
    sex: "female",
  });
  assert.equal(bmrFemale, 1299);

  assert.equal(Math.round(calculateTDEE(bmrMale, "light")), 2405);
});

test("calculateCaloriePlan menghitung defisit normal tanpa clamp BMR atau peringatan", () => {
  const result = calculateCaloriePlan({
    weightKg: 80,
    heightCm: 175,
    birthDate: "1996-01-01",
    sex: "male",
    activityLevel: "moderate",
    targetWeightKg: 72,
    weeklyLossGoalKg: 0.5,
    referenceDate: "2026-11-25",
  });

  // BMR = 1749, TDEE = round(1748.75 * 1.55) = 2711, defisit = 550 -> 2161
  assert.equal(result.bmr, 1749);
  assert.equal(result.tdee, 2711);
  assert.equal(result.rawTargetCalories, 2161);
  assert.equal(result.recommendedCalories, 2161);
  assert.equal(result.isClampedToBmr, false);
  assert.equal(result.bmrFloorNotice, null);
  assert.equal(result.isAggressiveRate, false);
  assert.equal(result.rateWarning, null);
  assert.equal(result.disclaimer, MEDICAL_DISCLAIMER);
  assert.ok(result.estimatedTargetDate && result.estimatedTargetDate > "2026-11-25");
});

test("calculateCaloriePlan menahan target di nilai BMR jika hasil hitung di bawah BMR", () => {
  // Kasus sedentari (1.2 * BMR): defisit 550 kcal/hari membuat TDEE - 550 < BMR
  const result = calculateCaloriePlan({
    weightKg: 60,
    heightCm: 160,
    birthDate: "1998-01-01",
    sex: "female",
    activityLevel: "sedentary",
    targetWeightKg: 55,
    weeklyLossGoalKg: 0.5,
    referenceDate: "2026-11-25",
  });

  // BMR = 1299, TDEE = round(1299 * 1.2) = 1559, raw = 1559 - 550 = 1009 < 1299
  assert.equal(result.bmr, 1299);
  assert.equal(result.tdee, 1559);
  assert.equal(result.rawTargetCalories, 1009);
  assert.equal(result.isClampedToBmr, true);
  assert.equal(result.recommendedCalories, result.bmr);
  assert.ok(result.bmrFloorNotice?.includes("BMR"));
});

test("calculateCaloriePlan memunculkan peringatan jika laju penurunan > 1 kg/minggu", () => {
  const result = calculateCaloriePlan({
    weightKg: 90,
    heightCm: 175,
    birthDate: "1996-01-01",
    sex: "male",
    activityLevel: "active",
    targetWeightKg: 75,
    weeklyLossGoalKg: 1.2,
    referenceDate: "2026-11-25",
  });

  assert.equal(result.isAggressiveRate, true);
  assert.ok(result.rateWarning?.includes("Peringatan"));
});

test("resolveSafeCalorieTarget menaikkan target tersimpan yang tertinggal di bawah BMR terbaru", () => {
  // BMR pria 90 kg, 175 cm, lahir 1996-01-01 pada 2026-11-25 (usia 30) = 1849
  const safe = resolveSafeCalorieTarget({
    storedCalorieTarget: 1650,
    weightKg: 90,
    heightCm: 175,
    birthDate: "1996-01-01",
    sex: "male",
    referenceDate: "2026-11-25",
  });

  assert.equal(safe.bmr, 1849);
  assert.equal(safe.effectiveCalorieTarget, 1849);
  assert.equal(safe.wasAdjustedToBmr, true);
});
