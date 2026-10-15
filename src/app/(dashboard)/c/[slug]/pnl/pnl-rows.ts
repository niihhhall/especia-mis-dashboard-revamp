import { fmtPct, negParens } from "@/lib/format";
import { mergeRows, sortIndirectExpenses } from "@/lib/mis/merge-rows";
import type { StatementLine } from "@/lib/mis/types";
import type { StatementColumn, StatementRowData } from "@/types/statement";

/** One month (or the YTD roll-up, a quarter or a branch) as a column of the statement. */
export interface PnlColumn {
  key: string;
  label: string;
  lines: StatementLine[];
}

const byKey = (lines: StatementLine[]) => Object.fromEntries(lines.map((l) => [l.key, l]));

/** The statement's column heads. */
export const pnlHead = (columns: PnlColumn[]): StatementColumn[] => columns.map((c) => ({ key: c.key, label: c.label }));

/**
 * The statement rows, one cell per column. The percent of revenue sits as a
 * small line under the amount in the same cell (not its own adjacent column),
 * so more months stay visible side by side without scrolling. Indirect
 * expenses are sorted by the last column's value, as before.
 */
export function pnlRows(columns: PnlColumn[], fmtAmount: (v: number) => string): StatementRowData[] {
  const maps = columns.map((c) => byKey(c.lines));
  const lastMap = maps[maps.length - 1] ?? {};
  const rows = sortIndirectExpenses(mergeRows(columns), (key) => lastMap[key]?.value ?? 0);
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    kind: row.emphasis ?? "line",
    cells:
      row.emphasis === "section"
        ? columns.map(() => ({ text: "" }))
        : maps.map((m) => {
            const line = m[row.key];
            if (!line) return { text: "-" };
            return {
              text: negParens(fmtAmount(line.value)),
              negative: line.value < 0 && !row.emphasis,
              sub: line.ratio !== undefined ? fmtPct(line.ratio) : undefined,
            };
          }),
  }));
}
