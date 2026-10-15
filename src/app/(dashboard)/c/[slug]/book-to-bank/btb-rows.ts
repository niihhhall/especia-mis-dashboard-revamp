import { negParens } from "@/lib/format";
import { mergeRows } from "@/lib/mis/merge-rows";
import type { StatementLine } from "@/lib/mis/types";
import type { StatementColumn, StatementRowData } from "@/types/statement";

/** One month (or the YTD roll-up) as a column of the statement. */
export interface BtbColumn {
  key: string;
  label: string;
  lines: StatementLine[];
}

const byKey = (lines: StatementLine[]) => Object.fromEntries(lines.map((l) => [l.key, l]));

/** The statement's column heads. */
export const btbHead = (columns: BtbColumn[]): StatementColumn[] => columns.map((c) => ({ key: c.key, label: c.label }));

/**
 * The Book to Bank statement laid out FY-wide, one amount column per month
 * plus a YTD roll-up, the same grammar as the P&L Detail table, just without
 * the %-of-revenue sub-line: a cash-flow movement isn't naturally a
 * percentage of revenue the way a P&L line is.
 */
export function btbRows(columns: BtbColumn[], fmtAmount: (v: number) => string): StatementRowData[] {
  const maps = columns.map((c) => byKey(c.lines));
  return mergeRows(columns).map((row) => ({
    key: row.key,
    label: row.label,
    kind: row.emphasis ?? "line",
    cells:
      row.emphasis === "section"
        ? columns.map(() => ({ text: "" }))
        : maps.map((m) => {
            const line = m[row.key];
            return line
              ? { text: negParens(fmtAmount(line.value)), negative: line.value < 0 && !row.emphasis }
              : { text: "-" };
          }),
  }));
}
