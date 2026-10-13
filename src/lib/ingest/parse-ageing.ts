import * as XLSX from "xlsx";

/** One party's outstanding balance split across the ageing buckets. */
export interface AgeingRow {
  party: string;
  b0_30: number;
  b30_60: number;
  b60_90: number;
  b90_180: number;
  b180_plus: number;
  total: number;
}

export interface ParsedAgeing {
  rows: AgeingRow[];
  /** The grand-total row the export carries above the header, when present. */
  reportedTotal: number | null;
}

const num = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,\s₹]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

/**
 * Reads a Tally debtor/creditor ageing export.
 *
 * Layout (identical for both sides):
 *   row 0   blank label, then the grand totals per bucket
 *   row 1   Debtors|Creditors | 0-30 | 30-60 | 60-90 | 90-180 | More than 180 | Total Pending
 *   row 2+  party | five bucket amounts | total
 *
 * The header row is located by content rather than assumed to be row 1, since
 * Tally sometimes prefixes a title block. Trailing all-zero rows — which the
 * creditors export pads with — are dropped.
 */
export function parseAgeing(buffer: Uint8Array): ParsedAgeing {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The ageing file has no sheets.");

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
  });

  const headerIdx = aoa.findIndex((r) =>
    r.some((c) => typeof c === "string" && c.replace(/\s/g, "") === "0-30"),
  );
  if (headerIdx === -1) {
    throw new Error("Could not find the ageing header row (expected a '0-30' column).");
  }

  // The totals line sits immediately above the header in these exports.
  const totalsRow = headerIdx > 0 ? aoa[headerIdx - 1] : null;
  const reportedTotal = totalsRow ? num(totalsRow[totalsRow.length - 1]) || null : null;

  const rows: AgeingRow[] = [];
  for (const raw of aoa.slice(headerIdx + 1)) {
    const party = typeof raw[0] === "string" ? raw[0].trim() : "";
    // Padding rows carry a 0 (not a name) in the first column.
    if (!party) continue;
    // A closing "Grand Total" line would double-count if kept.
    if (/^(grand\s*)?total$/i.test(party)) continue;

    const b0_30 = num(raw[1]);
    const b30_60 = num(raw[2]);
    const b60_90 = num(raw[3]);
    const b90_180 = num(raw[4]);
    const b180_plus = num(raw[5]);
    // Prefer the file's own total; fall back to the buckets if the column is absent.
    const total = raw[6] !== undefined ? num(raw[6]) : b0_30 + b30_60 + b60_90 + b90_180 + b180_plus;

    // Fully-settled parties carry zeros everywhere and add nothing to a report.
    if (!b0_30 && !b30_60 && !b60_90 && !b90_180 && !b180_plus && !total) continue;

    rows.push({ party, b0_30, b30_60, b60_90, b90_180, b180_plus, total });
  }

  return { rows, reportedTotal };
}
