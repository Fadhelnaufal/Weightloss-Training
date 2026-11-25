import assert from "node:assert/strict";
import test from "node:test";
import { buildCsvDocument, escapeCsvCell } from "../export/csv";

test("escapeCsvCell melindungi dari formula injection dan mengutip koma/tanda kutip", () => {
  assert.equal(escapeCsvCell("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assert.equal(escapeCsvCell("+cmd"), "'+cmd");
  assert.equal(escapeCsvCell("-10"), "'-10");
  assert.equal(escapeCsvCell("@evil"), "'@evil");
  assert.equal(escapeCsvCell('Nasi, "ayam"'), '"Nasi, ""ayam"""');
  assert.equal(escapeCsvCell(null), "");
});

test("buildCsvDocument menghasilkan UTF-8 BOM dan baris CRLF", () => {
  const csv = buildCsvDocument(["tanggal", "catatan"], [["2026-11-25", "Pagi"]]);
  assert.equal(csv, "\uFEFFtanggal,catatan\r\n2026-11-25,Pagi\r\n");
});
