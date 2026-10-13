// Turn parsed (unsigned) Trial Balance rows into normalized, SIGNED Master rows
// by (1) recovering Dr/Cr signs via the accounting identity and (2) mapping each
// leaf ledger to its MIS grouping.

import { DEFAULT_GROUPING, groupingNature } from "../mis/catalog";
import type { BsPl, LedgerMapEntry, MasterRow } from "../mis/types";
import type { ParsedTrialBalance } from "./parse-workbook";

const PL_CLASSIFICATIONS = new Set<string>([
  "Sales Accounts",
  "Purchase Accounts",
  "Direct Incomes",
  "Direct Expenses",
  "Indirect Incomes",
  "Indirect Expenses",
]);

const EPS = 1; // ₹1 tolerance for the closing-magnitude check

/**
 * Recover the signed opening and closing from unsigned magnitudes using the
 * identity `closing = opening + debit − credit`. We choose the opening sign that
 * makes |closing| match the reported closing magnitude; ties (rows with no
 * movement) are broken toward the account's natural side.
 */
export function recoverSigns(
  openMag: number,
  debit: number,
  credit: number,
  closeMag: number,
  nature: 1 | -1,
): { opening: number; closing: number } {
  const candidates = ([1, -1] as const).map((so) => {
    const closing = so * openMag + debit - credit;
    return {
      so,
      closing,
      resid: Math.abs(Math.abs(closing) - closeMag),
      natPenalty: openMag > 0 && so !== nature ? 1 : 0,
    };
  });
  candidates.sort((a, b) => a.resid - b.resid || a.natPenalty - b.natPenalty);
  const best = candidates[0];
  return { opening: best.so * openMag, closing: best.closing };
}

export interface NormalizeResult {
  rows: MasterRow[];
  /** Leaf ledgers with no confirmed mapping (the review queue). */
  unmapped: { ledger: string; classification: string; suggestion: string }[];
}

/**
 * Normalize parsed Trial Balance rows into Master rows using a per-company
 * ledger→grouping map. Group-header rows set the classification context that
 * flows down to their leaves. Unmapped leaves get the safe default grouping and
 * are surfaced for review.
 */
export function normalizeTrialBalance(
  parsed: ParsedTrialBalance,
  ledgerMap: LedgerMapEntry[],
  creditNatureGroupings: ReadonlySet<string>,
): NormalizeResult {
  const byLedger = new Map(ledgerMap.map((e) => [e.ledger.trim(), e]));
  const rows: MasterRow[] = [];
  const unmapped: NormalizeResult["unmapped"] = [];
  let currentClassification = "";

  for (const r of parsed.rows) {
    if (r.isGroup) {
      currentClassification = r.particulars;
      continue;
    }

    const entry = byLedger.get(r.particulars.trim());
    const classification = entry?.classification ?? currentClassification;
    let grouping: string;
    let bsPl: BsPl;
    let isUnmapped = false;

    if (entry) {
      grouping = entry.grouping;
      bsPl = entry.bs_pl;
    } else {
      grouping = DEFAULT_GROUPING;
      bsPl = PL_CLASSIFICATIONS.has(classification) ? "P.L" : "B.S";
      isUnmapped = true;
      unmapped.push({ ledger: r.particulars, classification, suggestion: grouping });
    }

    const { opening, closing } = recoverSigns(
      r.opening,
      r.debit,
      r.credit,
      r.closing,
      groupingNature(creditNatureGroupings, grouping),
    );

    rows.push({
      grouping,
      bsPl,
      particulars: r.particulars,
      classification,
      opening,
      debit: r.debit,
      credit: r.credit,
      closing,
      unmapped: isUnmapped || undefined,
      branchLabel: r.branchLabel,
    });
  }

  return { rows, unmapped };
}

/** True when a row's recovered closing magnitude disagrees with the source. */
export function closingMagnitudeMismatch(row: MasterRow, sourceCloseMag: number): boolean {
  return Math.abs(Math.abs(row.closing) - sourceCloseMag) > EPS;
}
