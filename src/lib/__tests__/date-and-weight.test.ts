import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWeightChartSeries,
  calculate7DayMovingAverage,
  calculateTargetDifference,
  filterChartSeriesByRange,
} from "../calc/weight";
import { isValidDateString, shiftDateString, todayWIB } from "../date";

test("todayWIB mengembalikan tanggal lokal WIB bukan UTC", () => {
  // 2026-11-25 18:30:00 UTC = 2026-11-26 01:30:00 WIB (+07:00)
  const utcEvening = new Date("2026-11-25T18:30:00.000Z");
  assert.equal(todayWIB(utcEvening), "2026-11-26");

  // 2026-11-25 16:59:59 UTC = 2026-11-25 23:59:59 WIB
  const beforeMidnightWIB = new Date("2026-11-25T16:59:59.000Z");
  assert.equal(todayWIB(beforeMidnightWIB), "2026-11-25");

  // Format wajib YYYY-MM-DD
  assert.match(todayWIB(), /^\d{4}-\d{2}-\d{2}$/);
});

test("shiftDateString dan isValidDateString bekerja untuk batas bulan dan tahun", () => {
  assert.equal(isValidDateString("2026-02-28"), true);
  assert.equal(isValidDateString("2026-02-30"), false);
  assert.equal(shiftDateString("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDateString("2026-01-01", -6), "2025-12-26");
});

test("calculate7DayMovingAverage mengembalikan null jika titik data < 3 dalam 7 hari kalender", () => {
  const entries = [
    { logDate: "2026-11-18", weightKg: 80.0 }, // di luar jendela [19..25]
    { logDate: "2026-11-20", weightKg: 79.5 },
    { logDate: "2026-11-25", weightKg: 79.0 },
  ];

  assert.equal(calculate7DayMovingAverage(entries, "2026-11-25"), null);
});

test("calculate7DayMovingAverage menghitung rata-rata hanya dari entri dalam 7 hari kalender terakhir", () => {
  const entries = [
    { logDate: "2026-11-18", weightKg: 85.0 }, // di luar jendela
    { logDate: "2026-11-19", weightKg: 79.0 }, // batas awal jendela (25 - 6 = 19)
    { logDate: "2026-11-22", weightKg: 78.5 },
    { logDate: "2026-11-25", weightKg: 78.0 }, // batas akhir jendela
  ];

  // (79.0 + 78.5 + 78.0) / 3 = 78.5
  assert.equal(calculate7DayMovingAverage(entries, "2026-11-25"), 78.5);
});

test("buildWeightChartSeries mengurutkan data dan menyaring rentang grafik dengan benar", () => {
  const series = buildWeightChartSeries([
    { logDate: "2026-11-25", weightKg: 78.0 },
    { logDate: "2026-10-01", weightKg: 82.0 },
    { logDate: "2026-11-23", weightKg: 78.4 },
    { logDate: "2026-11-21", weightKg: 78.8 },
  ]);

  assert.equal(series.length, 4);
  assert.equal(series[0].logDate, "2026-10-01");
  assert.equal(series[0].movingAvg7d, null);
  assert.equal(series[3].logDate, "2026-11-25");
  assert.equal(series[3].movingAvg7d, 78.4);

  const last30 = filterChartSeriesByRange(series, "30d", "2026-11-25");
  assert.equal(last30.length, 3);
  assert.equal(last30[0].logDate, "2026-11-21");
});

test("calculateTargetDifference menghitung selisih terhadap target", () => {
  assert.deepEqual(calculateTargetDifference(74.2, 70), {
    diffKg: 4.2,
    status: "above",
  });
  assert.deepEqual(calculateTargetDifference(70.02, 70), {
    diffKg: 0,
    status: "reached",
  });
  assert.deepEqual(calculateTargetDifference(69.2, 70), {
    diffKg: -0.8,
    status: "below",
  });
});
