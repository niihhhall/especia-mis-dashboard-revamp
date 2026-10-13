// Budget counterpart to pnl.ts's computePnl. A CA budgeting types ONE
// forecast number per P&L line per month — not a figure that needs
// sign-recovery from a ledger closing balance the way Actual does — so this
// stays a deliberately smaller, separate function rather than a parametrized
// variant of computePnl: sharing lineValue() would reintroduce the
// grouping/manual/computed branching budgeting doesn't need.

import type { TemplateLine } from "./catalog";
import type { PnlResult, StatementLine } from "./types";

/** The four scalar figures Actual sources from Master TB / Adjustments, with no per-company template line of their own. */
export const UNIVERSAL_BUDGET_KEYS = [
  "budgetOpeningStock",
  "budgetClosingStock",
  "budgetDepreciation",
  "budgetInterestExpense",
] as const;

export type BudgetByKey = Record<string, number>;

/**
 * Reproduces computePnl's exact section/subtotal arithmetic (Revenue → COGS
 * → Gross Profit → Indirect Income → Indirect Expense → EBITDA → EBIT →
 * EBT), but every leaf value is `budgetByKey[line.key] ?? 0` — no grouping
 * sums, no manual-key fallback, no negate. Returns the same PnlResult shape
 * as computePnl so the two compose directly in a Budget vs Actual table.
 */
export function computeBudgetPnl(budgetByKey: BudgetByKey, template: TemplateLine[]): PnlResult {
  const v = (key: string) => budgetByKey[key] ?? 0;
  const bySection = (section: TemplateLine["section"]) => template.filter((l) => l.section === section);

  const revenueLines = bySection("revenue");
  const revenueVals = revenueLines.map((l) => v(l.key));
  const revenue = revenueVals.reduce((a, b) => a + b, 0);

  const openingStock = v("budgetOpeningStock");
  const purchaseLines = bySection("purchase");
  const purchaseVals = purchaseLines.map((l) => v(l.key));
  const purchases = purchaseVals.reduce((a, b) => a + b, 0);
  const closingStock = v("budgetClosingStock");
  const directExpenseLines = bySection("direct_expense");
  const directExpenseVals = directExpenseLines.map((l) => v(l.key));
  const directExpenseTotal = directExpenseVals.reduce((a, b) => a + b, 0);
  const cogs = openingStock + purchases - closingStock + directExpenseTotal;

  const grossProfit = revenue - cogs;

  const indirectIncomeLines = bySection("indirect_income");
  const indirectIncomeVals = indirectIncomeLines.map((l) => v(l.key));
  const indirectIncome = indirectIncomeVals.reduce((a, b) => a + b, 0);

  const indirectExpenseLines = bySection("indirect_expense");
  const indirectExpenseVals = indirectExpenseLines.map((l) => v(l.key));
  const indirectExpense = indirectExpenseVals.reduce((a, b) => a + b, 0);

  const ebitda = grossProfit + indirectIncome - indirectExpense;
  const depreciation = v("budgetDepreciation");
  const ebit = ebitda - depreciation;
  const interestExpense = v("budgetInterestExpense");
  const ebt = ebit - interestExpense;

  const ratio = (val: number) => (revenue !== 0 ? val / revenue : 0);
  const L = (key: string, label: string, value: number, emphasis?: StatementLine["emphasis"]): StatementLine => ({
    key,
    label,
    value,
    ratio: ratio(value),
    emphasis,
  });

  const lines: StatementLine[] = [
    { key: "revenueHead", label: "Revenue", value: 0, emphasis: "section" },
    ...revenueLines.map((l, i) => L(l.key, l.label, revenueVals[i])),
    L("revenue", "Revenue From Operations", revenue, "subtotal"),

    { key: "cogsHead", label: "COGS", value: 0, emphasis: "section" },
    L("openingStock", "Opening Stock", openingStock),
    ...purchaseLines.map((l, i) => L(l.key, l.label, purchaseVals[i])),
    L("closingStock", "Closing Stock", closingStock),
    ...directExpenseLines.map((l, i) => L(l.key, l.label, directExpenseVals[i])),
    L("cogs", "COGS", cogs, "subtotal"),

    L("grossProfit", "Gross Profit", grossProfit, "subtotal"),

    { key: "indIncomeHead", label: "Indirect Income", value: 0, emphasis: "section" },
    ...indirectIncomeLines.map((l, i) => L(l.key, l.label, indirectIncomeVals[i])),
    L("indirectIncome", "Total Indirect Income", indirectIncome, "subtotal"),

    { key: "indExpHead", label: "Indirect Expenses", value: 0, emphasis: "section" },
    ...indirectExpenseLines.map((l, i) => L(l.key, l.label, indirectExpenseVals[i])),
    L("indirectExpense", "Total Indirect Expense", indirectExpense, "subtotal"),

    L("ebitda", "EBITDA", ebitda, "subtotal"),
    L("depreciation", "Depreciation", depreciation),
    L("ebit", "EBIT", ebit, "subtotal"),
    L("interestExpense", "Interest Expense", interestExpense),
    L("ebt", "EBT", ebt, "total"),
  ];

  return {
    lines,
    totals: { revenue, cogs, grossProfit, indirectIncome, indirectExpense, ebitda, ebit, ebt },
  };
}
