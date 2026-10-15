import { fmtPct, negParens } from "@/lib/format";
import type { TemplateLine } from "@/lib/mis/catalog";
import { mergeRows } from "@/lib/mis/merge-rows";
import type { StatementLine } from "@/lib/mis/types";
import type { StatementColumn, StatementRowData } from "@/types/statement";

/**
 * Which direction of variance is "good" for a given row: section-aware, not
 * a flat "negative = red" rule. Revenue and income-type rows (and the profit
 * subtotals they roll into) are favorable when Actual > Budget; cost-type
 * rows are favorable when Actual < Budget, since spending more than planned
 * is unfavorable even though the number itself is positive. Built once from
 * the company's own template, mirroring how `computePnl` and
 * `computeBudgetPnl` partition their line keys by section.
 */
function buildRevenueTypeKeys(template: TemplateLine[]): Set<string> {
  const keys = new Set(["revenue", "indirectIncome", "grossProfit", "ebitda", "ebit"]);
  for (const l of template) {
    if (l.section === "revenue" || l.section === "indirect_income") keys.add(l.key);
  }
  return keys;
}

/** The column heads; the unit caption follows the two amount heads as before. */
export const bvaHead = (caption: string): StatementColumn[] => [
  { key: "budget", label: `Budget ${caption}` },
  { key: "actual", label: `Actual ${caption}` },
  { key: "variance", label: "Variance" },
];

/** Budget, actual and variance per line. Subtotal and total rows carry no favourable or adverse word, as before. */
export function bvaRows(
  actual: StatementLine[],
  budget: StatementLine[],
  template: TemplateLine[],
  fmtAmount: (v: number) => string,
): StatementRowData[] {
  const actualByKey = Object.fromEntries(actual.map((l) => [l.key, l]));
  const budgetByKey = Object.fromEntries(budget.map((l) => [l.key, l]));
  const revenueTypeKeys = buildRevenueTypeKeys(template);
  const show = (v: number) => negParens(fmtAmount(v));

  return mergeRows([{ lines: actual }, { lines: budget }]).map((row) => {
    if (row.emphasis === "section") {
      return { key: row.key, label: row.label, kind: "section", cells: [{ text: "" }, { text: "" }, { text: "" }] };
    }
    const a = actualByKey[row.key]?.value ?? 0;
    const b = budgetByKey[row.key]?.value ?? 0;
    const variance = a - b;
    const variancePct = b !== 0 ? variance / b : null;
    const isRevenueType = revenueTypeKeys.has(row.key);
    const favorable = isRevenueType ? variance > 0 : variance < 0;
    const unfavorable = isRevenueType ? variance < 0 : variance > 0;
    // Words, not color, say good or bad (WCAG 1.4.1).
    const word = !row.emphasis && (favorable || unfavorable) ? (favorable ? "favourable" : "adverse") : "";
    const sub = variancePct !== null ? `${fmtPct(variancePct)}${word ? ` · ${word}` : ""}` : word || undefined;
    return {
      key: row.key,
      label: row.label,
      kind: row.emphasis ?? "line",
      cells: [{ text: show(b) }, { text: show(a) }, { text: show(variance), negative: variance < 0, sub }],
    };
  });
}
