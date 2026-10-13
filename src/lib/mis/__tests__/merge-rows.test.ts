import { describe, expect, it } from "vitest";

import { sortIndirectExpenses } from "../merge-rows";
import type { StatementLine } from "../types";

const L = (key: string, value = 0, emphasis?: StatementLine["emphasis"]): StatementLine => ({ key, label: key, value, emphasis });

const rows: StatementLine[] = [
  L("grossProfit", 500, "subtotal"),
  L("indExpHead", 0, "section"),
  L("rent", 40),
  L("salary", 90),
  L("misc", 5),
  L("bank", 90),
  L("indirectExpense", 225, "subtotal"),
  L("ebitda", 275, "subtotal"),
];

describe("sortIndirectExpenses", () => {
  it("orders only the lines between the section header and its subtotal, largest first", () => {
    const out = sortIndirectExpenses(rows, (k) => rows.find((r) => r.key === k)?.value ?? 0);
    expect(out.map((r) => r.key)).toEqual(["grossProfit", "indExpHead", "salary", "bank", "rent", "misc", "indirectExpense", "ebitda"]);
  });

  it("keeps equal amounts in their original order", () => {
    const out = sortIndirectExpenses(rows, (k) => rows.find((r) => r.key === k)?.value ?? 0);
    expect(out.indexOf(out.find((r) => r.key === "salary")!)).toBeLessThan(out.indexOf(out.find((r) => r.key === "bank")!));
  });

  it("sorts on whatever column the caller supplies", () => {
    const ytd: Record<string, number> = { rent: 300, salary: 1, misc: 2, bank: 3 };
    const out = sortIndirectExpenses(rows, (k) => ytd[k] ?? 0);
    expect(out.slice(2, 6).map((r) => r.key)).toEqual(["rent", "bank", "misc", "salary"]);
  });

  it("returns the rows untouched when there is no indirect-expense block", () => {
    const plain = [L("revenue", 1, "subtotal"), L("cogs", 2, "subtotal")];
    expect(sortIndirectExpenses(plain, () => 0)).toBe(plain);
  });
});
