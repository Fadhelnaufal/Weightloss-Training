import { shiftDateString } from "../date";

export interface WeightEntry {
  logDate: string;
  weightKg: number;
}

export interface WeightChartPoint {
  logDate: string;
  weightKg: number;
  movingAvg7d: number | null;
}

export type WeightChartRange = "30d" | "90d" | "all";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Menghitung rata-rata bergerak 7 hari kalender terakhir yang berakhir pada anchorDate
 * (inklusif [anchorDate - 6 hari, anchorDate]).
 * Sesuai DATA-MODEL.md: jika titik data < 3 dalam rentang 7 hari tersebut, kembalikan null.
 */
export function calculate7DayMovingAverage(
  entries: ReadonlyArray<WeightEntry>,
  anchorDate: string,
): number | null {
  const windowStart = shiftDateString(anchorDate, -6);
  const windowEntries = entries.filter(
    (entry) => entry.logDate >= windowStart && entry.logDate <= anchorDate,
  );

  if (windowEntries.length < 3) {
    return null;
  }

  const total = windowEntries.reduce((sum, entry) => sum + entry.weightKg, 0);
  return round2(total / windowEntries.length);
}

/**
 * Menyusun deret grafik terurut menaik beserta nilai rata-rata bergerak 7 hari di setiap titik.
 */
export function buildWeightChartSeries(
  entries: ReadonlyArray<WeightEntry>,
): WeightChartPoint[] {
  const byDate = new Map<string, WeightEntry>();
  for (const entry of entries) {
    byDate.set(entry.logDate, entry);
  }

  const sorted = Array.from(byDate.values()).sort((a, b) =>
    a.logDate.localeCompare(b.logDate),
  );

  return sorted.map((entry) => ({
    logDate: entry.logDate,
    weightKg: round2(entry.weightKg),
    movingAvg7d: calculate7DayMovingAverage(sorted, entry.logDate),
  }));
}

/**
 * Menyaring deret grafik berdasarkan rentang waktu tanpa merusak perhitungan rata-rata 7 hari.
 */
export function filterChartSeriesByRange(
  series: ReadonlyArray<WeightChartPoint>,
  range: WeightChartRange,
  referenceDate: string,
): WeightChartPoint[] {
  if (range === "all") {
    return [...series];
  }

  const daysBack = range === "30d" ? 29 : 89;
  const startDate = shiftDateString(referenceDate, -daysBack);
  return series.filter((point) => point.logDate >= startDate);
}

/**
 * Menghitung selisih berat terkini terhadap target.
 * Nilai positif berarti masih di atas target (perlu turun sekian kg).
 */
export function calculateTargetDifference(
  currentWeightKg: number | null,
  targetWeightKg: number | null,
): { diffKg: number; status: "above" | "below" | "reached" } | null {
  if (currentWeightKg === null || targetWeightKg === null) {
    return null;
  }

  const diffKg = round2(currentWeightKg - targetWeightKg);
  if (Math.abs(diffKg) < 0.05) {
    return { diffKg: 0, status: "reached" };
  }
  return {
    diffKg,
    status: diffKg > 0 ? "above" : "below",
  };
}
