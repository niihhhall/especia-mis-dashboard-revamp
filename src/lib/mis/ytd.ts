import type { StatementLine } from "./types";

/**
 * Year-to-date roll-up across a financial year's months.
 *
 * Most lines are flows and simply add up. Stock is the exception: the YTD
 * opening stock is the FIRST month's opening and the YTD closing is the LAST
 * month's closing, summing either would be meaningless. COGS still sums
 * correctly despite that, because consecutive months telescope (one month's
 * opening is the previous month's closing), leaving opening₁ + purchases − closingₙ.
 *
 * Shared by the P&L page and the Excel export so both agree.
 */
export function buildYtd(
  monthly: StatementLine[][],
  /** Extra balance lines: `first` take the first month's value, `last` the last month's (stock is always handled). */
  balances: { first?: string[]; last?: string[] } = {},
): StatementLine[] {
  if (monthly.length === 0) return [];
  const first = monthly[0];
  const last = monthly[monthly.length - 1];
  const pick = (lines: StatementLine[], key: string) => lines.find((l) => l.key === key)?.value ?? 0;

  const totals = new Map<string, StatementLine>();
  for (const lines of monthly) {
    for (const line of lines) {
      if (line.emphasis === "section") {
        totals.set(line.key, { ...line, value: 0 });
        continue;
      }
      const acc = totals.get(line.key);
      totals.set(line.key, acc ? { ...acc, value: acc.value + line.value } : { ...line });
    }
  }

  // Stock levels are balances, not flows, override the summed values.
  for (const key of ["openingStock", ...(balances.first ?? [])]) {
    const acc = totals.get(key);
    if (acc) totals.set(key, { ...acc, value: pick(first, key) });
  }
  for (const key of ["closingStock", ...(balances.last ?? [])]) {
    const acc = totals.get(key);
    if (acc) totals.set(key, { ...acc, value: pick(last, key) });
  }

  // Re-base every ratio on YTD revenue so the % column stays meaningful.
  const revenue = totals.get("revenue")?.value ?? 0;
  return [...totals.values()].map((l) =>
    l.emphasis === "section" || l.ratio === undefined
      ? l
      : { ...l, ratio: revenue ? l.value / revenue : undefined },
  );
}
