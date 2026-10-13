import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseBudgetTemplate } from "../../ingest/parse-budget-template";
import { computeBudgetPnl } from "../budget";
import type { TemplateLine } from "../catalog";

const template: TemplateLine[] = [
  { section: "revenue", sortOrder: 1, kind: "grouping", key: "vehicleSales", label: "Vehicle Sales", grouping: "Vehicle Sales", negate: true },
  { section: "purchase", sortOrder: 1, kind: "grouping", key: "vehiclesPurchase", label: "Vehicles Purchase", grouping: "Vehicles Purchase" },
  { section: "direct_expense", sortOrder: 1, kind: "grouping", key: "rent", label: "Rent Expense", grouping: "Rent Expense" },
  { section: "indirect_income", sortOrder: 1, kind: "manual", key: "discountReceived", label: "Discount Received", manualKey: "discountReceived", negate: true },
  { section: "indirect_expense", sortOrder: 1, kind: "grouping", key: "office", label: "Office Expense", grouping: "Office Expense" },
  { section: "indirect_expense", sortOrder: 2, kind: "computed", key: "financeCost", label: "Finance Cost", grouping: "Finance Cost" },
];

describe("computeBudgetPnl", () => {
  it("reproduces computePnl's subtotal arithmetic from flat per-line budget figures", () => {
    const { totals, lines } = computeBudgetPnl(
      {
        vehicleSales: 1_000_000,
        vehiclesPurchase: 600_000,
        rent: 20_000,
        discountReceived: 5_000,
        office: 50_000,
        financeCost: 7_000,
        budgetOpeningStock: 100_000,
        budgetClosingStock: 120_000,
        budgetDepreciation: 10_000,
        budgetInterestExpense: 8_000,
      },
      template,
    );
    expect(totals.revenue).toBe(1_000_000);
    expect(totals.cogs).toBe(600_000); // 100k + 600k - 120k + 20k
    expect(totals.grossProfit).toBe(400_000);
    expect(totals.indirectIncome).toBe(5_000);
    expect(totals.indirectExpense).toBe(57_000); // computed-kind line is just a flat number too
    expect(totals.ebitda).toBe(348_000);
    expect(totals.ebit).toBe(338_000);
    expect(totals.ebt).toBe(330_000);
    expect(lines.find((l) => l.key === "ebt")?.emphasis).toBe("total");
  });

  it("treats a line with no budget entered as 0, not an error", () => {
    const { totals } = computeBudgetPnl({ vehicleSales: 500 }, template);
    expect(totals.revenue).toBe(500);
    expect(totals.ebt).toBe(500);
  });
});

describe("parseBudgetTemplate", () => {
  const buildFile = (rows: (string | number | null)[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget");
    return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  };

  it("matches months by header text, rows by hidden key, and skips blank cells (never 0)", () => {
    const file = buildFile([
      [null, "Banner row"],
      [],
      [null, "Section", "Line", "Apr'26", "May'26"],
      ["sales", "Revenue", "Sales", 3000, null],
      ["rent", "Direct Expense", "Rent", null, null],
      ["budgetClosingStock", "Adjustments", "Closing Stock", "1,500", 0],
    ]);
    expect(parseBudgetTemplate(file)).toEqual([
      { key: "sales", periodLabel: "Apr'26", amount: 3000 },
      { key: "budgetClosingStock", periodLabel: "Apr'26", amount: 1500 },
      { key: "budgetClosingStock", periodLabel: "May'26", amount: 0 }, // an explicit 0 is a real figure
    ]);
  });

  it("rejects a file that isn't the downloaded template", () => {
    expect(() => parseBudgetTemplate(buildFile([["a", "b"]]))).toThrow(/header row/);
  });
});
