// Financial-quarter grouping for the month-by-month statements (P&L, Book to Bank).
//
// A quarter is three consecutive months counted from the company's own FY start
// (April start: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar). Picking a quarter folds
// its months into ONE column; every month not in a picked quarter stays as its own column.

export type Quarter = 1 | 2 | 3 | 4;

/** Which financial quarter a month ("2026-07-01") falls in. */
export function quarterOf(monthIso: string, fyStartMonthNo = 4): Quarter {
  const m = Number(monthIso.slice(5, 7));
  const offset = (m - fyStartMonthNo + 12) % 12; // 0 = first month of the FY
  return (Math.floor(offset / 3) + 1) as Quarter;
}

/** `?q=1,2` -> [1, 2]. Anything unrecognised is dropped; the result is sorted and unique. */
export function parseQuarters(raw: string | undefined | null): Quarter[] {
  if (!raw) return [];
  const picked = new Set<Quarter>();
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (n === 1 || n === 2 || n === 3 || n === 4) picked.add(n);
  }
  return [...picked].sort() as Quarter[];
}

/** [1, 2] -> "1,2" (the `?q=` value). */
export const quartersParam = (qs: Quarter[]): string => [...qs].sort().join(",");

export type ColumnPlan<T> =
  | { kind: "month"; item: T }
  /** `items` are the months of the quarter that actually exist (1–3), in order. */
  | { kind: "quarter"; quarter: Quarter; items: T[] };

/**
 * Lays out the columns for a run of months. Each picked quarter becomes a single entry placed where
 * its first existing month would have been; all other months stay one-per-column. A picked quarter
 * with no months on file produces nothing.
 */
export function planColumns<T>(
  items: T[],
  monthOf: (item: T) => string,
  selected: Quarter[],
  fyStartMonthNo = 4,
): ColumnPlan<T>[] {
  const picked = new Set(selected);
  const plan: ColumnPlan<T>[] = [];
  const quarterEntries = new Map<Quarter, Extract<ColumnPlan<T>, { kind: "quarter" }>>();
  for (const item of items) {
    const q = quarterOf(monthOf(item), fyStartMonthNo);
    if (!picked.has(q)) {
      plan.push({ kind: "month", item });
      continue;
    }
    const existing = quarterEntries.get(q);
    if (existing) {
      existing.items.push(item);
    } else {
      const entry = { kind: "quarter" as const, quarter: q, items: [item] };
      quarterEntries.set(q, entry);
      plan.push(entry);
    }
  }
  return plan;
}

/** "Q2", or "Q2 (2 of 3 months)" when only part of the quarter is on file. */
export function quarterLabel(quarter: Quarter, monthsPresent: number): string {
  return monthsPresent >= 3 ? `Q${quarter}` : `Q${quarter} (${monthsPresent} of 3 months)`;
}

/** Which quarters have at least one month in `items` — the rest have nothing to show. */
export function quartersWithData<T>(items: T[], monthOf: (item: T) => string, fyStartMonthNo = 4): Set<Quarter> {
  return new Set(items.map((i) => quarterOf(monthOf(i), fyStartMonthNo)));
}
