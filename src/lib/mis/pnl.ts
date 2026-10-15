// P&L Detail engine. Computes the Profit Statement from normalized Master rows
// plus per-period manual inputs, mirroring the reference workbook's `P&L` sheet
// formulas exactly. Pure and deterministic, the company's own line list
// (`template`) is passed in rather than fetched here, same reasoning as
// `master`/`manual`: it keeps this function DB-free and fixture-testable.

import type { TemplateLine } from "./catalog";
import type { ManualInputs, MasterRow, PnlResult, StatementLine } from "./types";

/** Index Master rows by grouping for O(1) SUMIFS-style aggregation. */
export function groupIndex(master: MasterRow[]) {
  const closing = new Map<string, number>();
  const opening = new Map<string, number>();
  const debit = new Map<string, number>();
  const credit = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  for (const r of master) {
    add(closing, r.grouping, r.closing);
    add(opening, r.grouping, r.opening);
    add(debit, r.grouping, r.debit);
    add(credit, r.grouping, r.credit);
  }
  return {
    sumClosing: (g: string) => closing.get(g) ?? 0,
    sumOpening: (g: string) => opening.get(g) ?? 0,
    sumDebit: (g: string) => debit.get(g) ?? 0,
    sumCredit: (g: string) => credit.get(g) ?? 0,
  };
}

/**
 * One line's value, given its spec and the closing/manual context.
 *
 * `negate` only flips a value RECOVERED FROM A GROUPING'S CLOSING BALANCE -
 * that's the sign-recovery step for a naturally-negative (credit-nature)
 * ledger reading positive as revenue/income. A MANUAL override is never
 * negated: a human enters "Accessories Sales" as the positive figure it
 * plainly is, so applying the same flip there would double-negate it. This
 * exactly matches every hardcoded line the old catalog.ts constants used to
 * express by hand (e.g. `num(manual.accessoriesSales) ?? -sumClosing(...)`).
 */
function lineValue(
  spec: TemplateLine,
  sumClosing: (g: string) => number,
  manual: ManualInputs,
  interestExpense: number,
): number {
  const num = (v: number | undefined) => (typeof v === "number" ? v : undefined);
  const fromGrouping = (g: string | undefined) => {
    const v = g ? sumClosing(g) : 0;
    return spec.negate ? -v : v;
  };
  if (spec.kind === "grouping") {
    return fromGrouping(spec.grouping);
  }
  if (spec.kind === "computed") {
    // Finance Cost, net of the interest carved out to Interest Expense, the
    // one narrow, fixed meaning `computed` has (see catalog.ts's doc comment).
    return (spec.grouping ? sumClosing(spec.grouping) : 0) - interestExpense;
  }
  // kind === "manual"
  const manualVal = spec.manualKey ? num(manual[spec.manualKey] as number | undefined) : undefined;
  return manualVal ?? fromGrouping(spec.fallbackGrouping);
}

export function computePnl(master: MasterRow[], manual: ManualInputs, template: TemplateLine[]): PnlResult {
  const { sumClosing, sumOpening } = groupIndex(master);
  const num = (v: number | undefined) => (typeof v === "number" ? v : undefined);
  const interestExpense = num(manual.interestExpense) ?? 0;

  const bySection = (section: TemplateLine["section"]) =>
    template.filter((l) => l.section === section);

  // --- Revenue --- each line's own `negate` (applied inside lineValue, only
  // to a grouping-sourced value) flips a naturally-negative closing balance
  // to read positive as revenue.
  const revenueLines = bySection("revenue");
  const revenueVals = revenueLines.map((l) => lineValue(l, sumClosing, manual, interestExpense));
  const revenue = revenueVals.reduce((a, b) => a + b, 0);

  // --- COGS ---
  const openingStock = sumOpening("Opening Stock");
  const purchaseLines = bySection("purchase");
  const purchaseVals = purchaseLines.map((l) => lineValue(l, sumClosing, manual, interestExpense));
  const purchases = purchaseVals.reduce((a, b) => a + b, 0);
  const closingStock = num(manual.closingStock) ?? 0;
  const directExpenseLines = bySection("direct_expense");
  const directExpenseVals = directExpenseLines.map((l) => lineValue(l, sumClosing, manual, interestExpense));
  const directExpenseTotal = directExpenseVals.reduce((a, b) => a + b, 0);
  const cogs = openingStock + purchases - closingStock + directExpenseTotal;

  const grossProfit = revenue - cogs;

  // --- Indirect income --- same negate convention as revenue.
  const indirectIncomeLines = bySection("indirect_income");
  const indirectIncomeVals = indirectIncomeLines.map((l) => lineValue(l, sumClosing, manual, interestExpense));
  const indirectIncome = indirectIncomeVals.reduce((a, b) => a + b, 0);

  // --- Indirect expenses ---
  const indirectExpenseLines: StatementLine[] = bySection("indirect_expense").map((spec) => ({
    key: spec.key,
    label: spec.label,
    value: lineValue(spec, sumClosing, manual, interestExpense),
  }));
  const indirectExpense = indirectExpenseLines.reduce((a, l) => a + l.value, 0);

  const ebitda = grossProfit + indirectIncome - indirectExpense;
  const depreciation = num(manual.depreciation) ?? 0;
  const ebit = ebitda - depreciation;
  const ebt = ebit - interestExpense;

  const ratio = (v: number) => (revenue !== 0 ? v / revenue : 0);
  const L = (
    key: string,
    label: string,
    value: number,
    emphasis?: StatementLine["emphasis"],
  ): StatementLine => ({ key, label, value, ratio: ratio(value), emphasis });

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
    ...indirectExpenseLines.map((l) => L(l.key, l.label, l.value)),
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
