import type { StatementLine } from "./types";

/**
 * Merges the row order across a set of monthly statement columns.
 *
 * Months do NOT always carry the same rows, a new ledger appearing in June
 * adds an indirect-expense line that April never had. Taking any single month
 * as the skeleton would silently drop the others' rows, so this walks every
 * month and keeps each key in the position it was first seen.
 *
 * Shared by the P&L and Book to Bank tables, which both render a statement as
 * one row per line-item key across a run of monthly columns.
 */
export function mergeRows(columns: { lines: StatementLine[] }[]): StatementLine[] {
  const order: StatementLine[] = [];
  const seen = new Set<string>();
  for (const col of columns) {
    let insertAt = 0;
    for (const line of col.lines) {
      const existing = order.findIndex((l) => l.key === line.key);
      if (seen.has(line.key)) {
        insertAt = existing + 1;
        continue;
      }
      seen.add(line.key);
      order.splice(insertAt, 0, line);
      insertAt += 1;
    }
  }
  return order;
}

/**
 * Orders the Indirect Expenses block largest-first, so the heaviest costs
 * read at the top instead of in template order. Sorted on the LAST column
 * (YTD in the monthly view, the scope's Total in the branch-wise view, or
 * the single month), the one figure that summarises every column, so the
 * row order stays the same across all of them.
 */
export function sortIndirectExpenses(rows: StatementLine[], valueOf: (key: string) => number): StatementLine[] {
  const start = rows.findIndex((r) => r.key === "indExpHead");
  const end = rows.findIndex((r) => r.key === "indirectExpense");
  if (start === -1 || end === -1 || end - start < 3) return rows;
  const block = rows.slice(start + 1, end).sort((a, b) => valueOf(b.key) - valueOf(a.key));
  return [...rows.slice(0, start + 1), ...block, ...rows.slice(end)];
}
