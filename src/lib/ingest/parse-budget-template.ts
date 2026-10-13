// SheetJS-based reader for the Budget template round trip: the file
// downloaded from `/c/[slug]/budget/template` (built with ExcelJS — see
// `budget-template-workbook.ts`), filled in offline, then re-uploaded.
//
// Columns are matched BY HEADER NAME (period label), not fixed index, and
// each row's identity comes from the hidden key column (column A), not the
// visible Label text — mirrors `parse-mapping-template.ts`'s by-header-name
// philosophy, adapted for a row-per-line/column-per-month layout.

import { readSheetAoa } from "./parse-workbook";

export interface BudgetTemplateCell {
  key: string;
  periodLabel: string;
  amount: number;
}

function norm(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Parses a numeric cell; returns undefined for blank (the "leave this cell alone" signal). */
function parseAmount(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parses the re-uploaded Budget template. Only cells that actually have a
 * value produce an entry — a blank cell is skipped entirely, never coerced
 * to 0, so the caller's upsert leaves that (line, month)'s existing figure
 * untouched.
 */
export function parseBudgetTemplate(buf: ArrayBuffer | Uint8Array): BudgetTemplateCell[] {
  const aoa = readSheetAoa(buf);

  // Find the header row: the first row containing both "Section" and "Line"
  // (case-insensitive) in adjacent-ish cells — tolerates the instruction
  // banner rows above it without hardcoding a row number.
  let headerRowIdx = -1;
  let lineCol = -1;
  let firstMonthCol = -1;
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    let sectionCol = -1;
    row.forEach((cell, c) => {
      const text = norm(cell).toLowerCase();
      if (text === "section") sectionCol = c;
      if (text === "line") lineCol = c;
    });
    if (sectionCol !== -1 && lineCol !== -1) {
      headerRowIdx = r;
      firstMonthCol = lineCol + 1;
      break;
    }
  }
  if (headerRowIdx === -1) {
    throw new Error('Could not find the "Section" / "Line" header row — is this the downloaded Budget template?');
  }

  const headerRow = aoa[headerRowIdx] ?? [];
  const monthCols: { col: number; label: string }[] = [];
  for (let c = firstMonthCol; c < headerRow.length; c++) {
    const label = norm(headerRow[c]);
    if (label) monthCols.push({ col: c, label });
  }
  if (monthCols.length === 0) {
    throw new Error("No month columns found after the Line column — is this the downloaded Budget template?");
  }

  const out: BudgetTemplateCell[] = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const key = norm(row[0]); // hidden key column
    if (!key) continue;
    for (const { col, label } of monthCols) {
      const amount = parseAmount(row[col]);
      if (amount === undefined) continue; // blank cell = leave this (line, month) alone
      out.push({ key, periodLabel: label, amount });
    }
  }
  return out;
}
