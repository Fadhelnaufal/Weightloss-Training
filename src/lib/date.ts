import { addDays, format, getISODay, isValid, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const DEFAULT_TIMEZONE = "Asia/Jakarta";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const WEEKDAY_NAMES_ID: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

/**
 * Mengembalikan nomor hari ISO (1 = Senin ... 7 = Minggu) dari string 'YYYY-MM-DD'.
 */
export function getIsoWeekday(dateStr: string): number {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Tanggal tidak valid: ${dateStr}`);
  }
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date(2000, 0, 1));
  return getISODay(parsed);
}

/**
 * Mengembalikan tanggal lokal WIB saat ini dalam format 'YYYY-MM-DD'.
 * Tidak menggunakan toISOString() agar tanggal tidak bergeser ke UTC.
 */
export function todayWIB(now: Date = new Date()): string {
  const timeZone = process.env.APP_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Gagal memformat tanggal WIB.");
  }

  return `${year}-${month}-${day}`;
}

/**
 * Memastikan string berformat YYYY-MM-DD dan merupakan tanggal kalender yang valid.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!DATE_PATTERN.test(dateStr)) {
    return false;
  }
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date(2000, 0, 1));
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === dateStr;
}

/**
 * Menggeser tanggal 'YYYY-MM-DD' sebanyak N hari kalender tanpa konversi UTC.
 */
export function shiftDateString(dateStr: string, days: number): string {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Tanggal tidak valid: ${dateStr}`);
  }
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date(2000, 0, 1));
  return format(addDays(parsed, days), "yyyy-MM-dd");
}

/**
 * Format tampilan tanggal berbahasa Indonesia (misal: "25 Nov 2026").
 */
export function formatDateID(dateStr: string): string {
  if (!isValidDateString(dateStr)) {
    return dateStr;
  }
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date(2000, 0, 1));
  return format(parsed, "d MMM yyyy", { locale: idLocale });
}

/**
 * Format ringkas tanggal untuk sumbu grafik (misal: "25/11").
 */
export function formatShortDateID(dateStr: string): string {
  if (!isValidDateString(dateStr)) {
    return dateStr;
  }
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date(2000, 0, 1));
  return format(parsed, "d/MM", { locale: idLocale });
}
