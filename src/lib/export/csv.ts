const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export type CsvCell = string | number | boolean | null | undefined;

/**
 * Mengamankan sel CSV dari formula injection dan memformat kutipan sesuai RFC 4180.
 */
export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);
  if (
    text.length > 0 &&
    FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))
  ) {
    text = `'${text}`;
  }

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Mengubah header + baris data menjadi string CSV UTF-8 dengan BOM agar rapi di Excel.
 */
export function buildCsvDocument(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<CsvCell>>,
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
