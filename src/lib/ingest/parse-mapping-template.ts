// SheetJS-based reader for the bulk mapping-template round trip: the file
// downloaded from `/c/[slug]/mapping/template` (built with ExcelJS — see
// `mis-mapping-template.ts`), filled in offline by a CA, then re-uploaded.
//
// Unlike `parseTrialBalance()` (which has to content-sniff a Tally-authored
// file's shape), this file's layout is entirely under this app's own
// control — but columns are still matched BY HEADER NAME, not fixed index,
// so an Excel-savvy CA reordering columns doesn't silently break the import.

import { readSheetAoa } from "./parse-workbook";

export interface MappingTemplateRow {
  ledger: string;
  /** Only present when the CA filled in a value; caller defaults it otherwise. */
  bsPl: "B.S" | "P.L" | null;
  classification: string | null;
  grouping: string;
}

const HEADERS = {
  ledger: "ledger",
  classification: "classification",
  bsPl: "b.s/p.l",
  newGrouping: "new grouping",
} as const;

function norm(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/**
 * Parses the re-uploaded template. Rows whose "New Grouping" cell is blank
 * are skipped entirely — that's the "leave it blank to skip this ledger"
 * contract the downloaded file's instructions describe.
 */
export function parseMappingTemplate(buf: ArrayBuffer | Uint8Array): MappingTemplateRow[] {
  const aoa = readSheetAoa(buf);

  // Find the header row: the first row containing both "Ledger" and
  // "New Grouping" (case-insensitive) — tolerates the instruction banner
  // row(s) above it without hardcoding a row number.
  let headerRowIdx = -1;
  let cols: Record<keyof typeof HEADERS, number> = { ledger: -1, classification: -1, bsPl: -1, newGrouping: -1 };
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const found: Partial<Record<keyof typeof HEADERS, number>> = {};
    row.forEach((cell, c) => {
      const text = norm(cell).toLowerCase();
      for (const key of Object.keys(HEADERS) as (keyof typeof HEADERS)[]) {
        if (text === HEADERS[key]) found[key] = c;
      }
    });
    if (found.ledger !== undefined && found.newGrouping !== undefined) {
      headerRowIdx = r;
      cols = {
        ledger: found.ledger,
        classification: found.classification ?? -1,
        bsPl: found.bsPl ?? -1,
        newGrouping: found.newGrouping,
      };
      break;
    }
  }
  if (headerRowIdx === -1) {
    throw new Error('Could not find the "Ledger" / "New Grouping" header row — is this the downloaded template?');
  }

  const out: MappingTemplateRow[] = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const ledger = norm(row[cols.ledger]);
    const grouping = norm(row[cols.newGrouping]);
    if (!ledger || !grouping) continue; // blank New Grouping ⇒ skip this row

    const bsPlRaw = cols.bsPl >= 0 ? norm(row[cols.bsPl]).toUpperCase() : "";
    const bsPl: MappingTemplateRow["bsPl"] = bsPlRaw === "P.L" ? "P.L" : bsPlRaw === "B.S" ? "B.S" : null;

    out.push({
      ledger,
      grouping,
      bsPl,
      classification: cols.classification >= 0 ? norm(row[cols.classification]) || null : null,
    });
  }
  return out;
}
