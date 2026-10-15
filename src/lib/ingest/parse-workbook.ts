// SheetJS-based readers that turn uploaded Excel files into plain data
// structures. Pure parsing only, no signs, no mapping (that is normalize.ts).
// Handles both real .xlsx and Tally's mislabeled .xls (actually OOXML) exports.

import * as XLSX from "xlsx";

import { KNOWN_GROUP_NAMES, TOTAL_ROW_NAMES } from "../mis/catalog";
import type { RawLedgerRow } from "../mis/types";

type Cell = string | number | null;
type Aoa = Cell[][];

/** Read a worksheet as an array-of-arrays of raw values. */
export function readSheetAoa(buf: ArrayBuffer | Uint8Array, sheetName?: string): Aoa {
  const wb = XLSX.read(buf, { type: "buffer" });
  const name = sheetName ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet "${name}" not found. Available: ${wb.SheetNames.join(", ")}`);
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
}

/** Coerce a cell to a finite number (strip thousands separators); null -> 0. */
function toNum(v: Cell): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function isBlankRow(row: Cell[]): boolean {
  return !row || row.every((c) => c == null || String(c).trim() === "");
}

/**
 * Locate the "Particulars" column: the column index in which a known Tally
 * primary-group header first appears. Tally exports normally put it at column 0,
 * but this tolerates a leading blank column.
 */
function findParticularsColumn(aoa: Aoa): number {
  for (const row of aoa) {
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (typeof val === "string" && KNOWN_GROUP_NAMES.has(val.trim())) return c;
    }
  }
  return 0;
}

export interface ParsedTrialBalance {
  /** Every data row between the first group header and Grand Total (groups + leaves). */
  rows: (RawLedgerRow & { isGroup: boolean })[];
  /** Grand Total debit/credit, for a balance sanity check. */
  grandTotal: { debit: number; credit: number } | null;
  /**
   * Branch labels detected, in column order, a Tally multi-branch export
   * repeats the same ledger once per branch, each with its own Opening/
   * Debit/Credit/Closing block. Empty for a normal single-block file (the
   * overwhelming common case, and the only case before this feature
   * existed), every row's `branchLabel` is then `undefined` too.
   */
  branches: string[];
}

const BLOCK_WIDTH = 4; // Opening, Debit, Credit, Closing: one Tally "period" block

interface BranchBlock {
  /** Undefined for the single, legacy block. */
  label?: string;
  /** Column of this block's Opening value. */
  startCol: number;
}

/**
 * Detect N repeating 4-column Opening/Debit/Credit/Closing blocks, one per
 * Tally branch column, from the header rows above the first primary-group
 * row (`headerRows`, everything `parseTrialBalance` skips before `started`
 * flips true).
 *
 * Tally merges each branch's name across its own 4-column block, so SheetJS
 * (with `defval: null`) gives us the label at only the block's first column
 * (`pc+1`, `pc+1+4`, `pc+1+8`, …), the other 3 are `null`. But the row
 * directly below the branch-name row is a repeated date range ("1-Apr-26 to
 * 30-Apr-26"), which *also* has a non-null value at every one of those same
 * columns, just the SAME value repeated, not one per branch. Requiring 2+
 * DISTINCT labels is what tells the two apart; among every header row that
 * qualifies, the one with the most labels wins (in case an intermediate row
 * also happens to carry 2+ distinct short strings by coincidence).
 *
 * 0 or 1 label found → today's exact single-block file, unchanged: a single
 * `{ label: undefined, startCol: pc + 1 }`, the same offsets the original
 * hardcoded `pc+1..pc+4` used. This is the backward-compatibility guarantee
 * for every current single-branch company.
 */
function detectBranchBlocks(headerRows: Aoa, pc: number): BranchBlock[] {
  let best: string[] = [];
  for (const row of headerRows) {
    if (!row) continue;
    const labels: string[] = [];
    for (let c = pc + 1; c < row.length; c += BLOCK_WIDTH) {
      const v = row[c];
      if (typeof v === "string" && v.trim()) labels.push(v.trim());
    }
    if (new Set(labels).size > 1 && labels.length > best.length) best = labels;
  }
  if (best.length < 2) return [{ startCol: pc + 1 }];
  return best.map((label, i) => ({ label, startCol: pc + 1 + i * BLOCK_WIDTH }));
}

/**
 * Parse a raw Tally Trial Balance export into rows. Skips the title/header block
 * and stops at Grand Total. Each row carries its UNSIGNED magnitudes plus an
 * isGroup flag (true for primary-group subtotal headers).
 *
 * For a multi-branch export, every ledger row is pushed once PER detected
 * branch block, each tagged with that branch's `branchLabel` and carrying
 * only that branch's own figures, `normalizeTrialBalance`/the upload
 * action later resolve each label to a `branches.id`. A single-block file
 * produces exactly what it always has: one row per ledger, `branchLabel`
 * undefined.
 */
export function parseTrialBalance(buf: ArrayBuffer | Uint8Array, sheetName?: string): ParsedTrialBalance {
  const aoa = readSheetAoa(buf, sheetName);
  const pc = findParticularsColumn(aoa);

  // Header rows = everything before the first primary-group row, the same
  // rows `started` below skips, collected up front so block detection can
  // look at all of them, not just whichever happens to be directly above
  // the data.
  const headerRows: Aoa = [];
  for (const row of aoa) {
    if (isBlankRow(row)) continue;
    const nameRaw = row[pc];
    const name = typeof nameRaw === "string" ? nameRaw.trim() : nameRaw == null ? "" : String(nameRaw).trim();
    if (name && KNOWN_GROUP_NAMES.has(name)) break;
    headerRows.push(row);
  }
  const blocks = detectBranchBlocks(headerRows, pc);

  const rows: (RawLedgerRow & { isGroup: boolean })[] = [];
  let grandTotal: { debit: number; credit: number } | null = null;
  let started = false;

  for (const row of aoa) {
    if (isBlankRow(row)) continue;
    const nameRaw = row[pc];
    const name = typeof nameRaw === "string" ? nameRaw.trim() : nameRaw == null ? "" : String(nameRaw).trim();
    if (!name) continue;

    // Begin once we hit the first primary-group header.
    if (!started) {
      if (KNOWN_GROUP_NAMES.has(name)) started = true;
      else continue;
    }

    if (name === "Grand Total") {
      let debit = 0;
      let credit = 0;
      for (const b of blocks) {
        debit += toNum(row[b.startCol + 1]);
        credit += toNum(row[b.startCol + 2]);
      }
      grandTotal = { debit, credit };
      break;
    }
    // Skip stray header words that may repeat inside the block.
    if (TOTAL_ROW_NAMES.has(name)) continue;

    const isGroup = KNOWN_GROUP_NAMES.has(name);
    for (const b of blocks) {
      rows.push({
        particulars: name,
        opening: Math.abs(toNum(row[b.startCol])),
        debit: Math.abs(toNum(row[b.startCol + 1])),
        credit: Math.abs(toNum(row[b.startCol + 2])),
        closing: Math.abs(toNum(row[b.startCol + 3])),
        isGroup,
        branchLabel: b.label,
      });
    }
  }

  const branches = blocks.map((b) => b.label).filter((l): l is string => Boolean(l));
  return { rows, grandTotal, branches };
}

export interface ParsedStockInfo {
  periodLabel: string | null;
  opening: Record<string, number>;
  closing: Record<string, number>;
  openingTotal: number;
  closingTotal: number;
}

/**
 * Parse the Stock Info sheet: two small labeled tables ("Opening Stock" /
 * "Closing Stock") whose columns are stock categories (e.g. BHAKURI, SPARES,
 * VEHICLES, TOTAL).
 */
export function parseStockInfo(buf: ArrayBuffer | Uint8Array, sheetName?: string): ParsedStockInfo {
  const aoa = readSheetAoa(buf, sheetName);
  let periodLabel: string | null = null;
  let headers: string[] = [];
  const opening: Record<string, number> = {};
  const closing: Record<string, number> = {};

  const findLabel = (row: Cell[]) => {
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (typeof v === "string" && v.trim()) return { col: c, text: v.trim() };
    }
    return null;
  };

  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const label = findLabel(row);
    if (!label) continue;
    const text = label.text.toLowerCase();

    if (/^[a-z]{3,}\s*\d{4}$/i.test(label.text) && !periodLabel) periodLabel = label.text;

    if (text.startsWith("opening stock") || text.startsWith("closing stock")) {
      // Header names are on this label row after the label; values on the next row.
      headers = row.slice(label.col + 1).map((c) => (c == null ? "" : String(c).trim()));
      const valueRow = aoa[r + 1] ?? [];
      const target = text.startsWith("opening") ? opening : closing;
      headers.forEach((h, i) => {
        if (!h) return;
        target[h] = toNum(valueRow[label.col + 1 + i]);
      });
    }
  }

  const sumNonTotal = (rec: Record<string, number>) =>
    Object.entries(rec)
      .filter(([k]) => k.toUpperCase() !== "TOTAL")
      .reduce((s, [, v]) => s + v, 0);

  return {
    periodLabel,
    opening,
    closing,
    openingTotal: opening.TOTAL ?? opening.Total ?? sumNonTotal(opening),
    closingTotal: closing.TOTAL ?? closing.Total ?? sumNonTotal(closing),
  };
}
