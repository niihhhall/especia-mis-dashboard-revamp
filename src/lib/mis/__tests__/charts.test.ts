import { describe, expect, it } from "vitest";

import type { TemplateLine } from "../catalog";
import { expenseItems, toCsv, trimCommonPrefix, varianceRows } from "../charts";
import type { StatementLine } from "../types";

const template: TemplateLine[] = [
  { section: "revenue", sortOrder: 1, kind: "grouping", key: "sales", label: "Sales", grouping: "Sales", negate: true },
  { section: "purchase", sortOrder: 1, kind: "grouping", key: "purchase", label: "Purchase", grouping: "Purchase" },
  { section: "direct_expense", sortOrder: 1, kind: "grouping", key: "rent", label: "Rent", grouping: "Rent" },
  { section: "indirect_income", sortOrder: 1, kind: "grouping", key: "disc", label: "Discount", grouping: "Discount", negate: true },
  { section: "indirect_expense", sortOrder: 1, kind: "grouping", key: "office", label: "Office", grouping: "Office" },
  { section: "btb_current_asset", sortOrder: 1, kind: "grouping", key: "otherCA", label: "Other CA", grouping: "Other CA" },
];

const line = (key: string, value: number): StatementLine => ({ key, label: key, value });

describe("expenseItems", () => {
  it("keeps only cost sections (purchase, direct, indirect) and tags each with its section", () => {
    const items = expenseItems(template, [line("sales", 900), line("purchase", 300), line("rent", 50), line("disc", 5), line("office", 20), line("otherCA", 7)]);
    expect(items).toEqual([
      { key: "purchase", label: "Purchase", section: "purchase", value: 300 },
      { key: "rent", label: "Rent", section: "direct_expense", value: 50 },
      { key: "office", label: "Office", section: "indirect_expense", value: 20 },
    ]);
  });

  it("skips a template line that has no computed value", () => {
    expect(expenseItems(template, [line("purchase", 1)])).toHaveLength(1);
  });
});

describe("varianceRows", () => {
  it("pairs Budget with Actual for every P&L line, 0 when a side is missing, and drops balance-sheet lines", () => {
    const rows = varianceRows(template, [line("sales", 90), line("office", 25)], [line("sales", 100), line("rent", 40)]);
    expect(rows.map((r) => r.key)).toEqual(["sales", "purchase", "rent", "disc", "office"]);
    expect(rows.find((r) => r.key === "sales")).toMatchObject({ budget: 100, actual: 90 });
    expect(rows.find((r) => r.key === "rent")).toMatchObject({ budget: 40, actual: 0 });
    expect(rows.find((r) => r.key === "office")).toMatchObject({ budget: 0, actual: 25 });
  });
});

describe("trimCommonPrefix", () => {
  it("strips the shared leading words so branch names stay short", () => {
    expect(trimCommonPrefix(["ROYAL ENTERPRISE (PUNE)", "ROYAL ENTERPRISE (SURAT)"])).toEqual(["(PUNE)", "(SURAT)"]);
  });
  it("leaves a lone label, or labels with nothing shared, untouched", () => {
    expect(trimCommonPrefix(["ONLY ONE"])).toEqual(["ONLY ONE"]);
    expect(trimCommonPrefix(["JAIPUR", "INDORE"])).toEqual(["JAIPUR", "INDORE"]);
  });
  it("never strips a label down to nothing", () => {
    expect(trimCommonPrefix(["A B", "A B"])).toEqual(["B", "B"]);
  });
});

describe("toCsv", () => {
  it("quotes cells containing commas, quotes or newlines", () => {
    expect(toCsv([["Name", "Amount"], ['Smith, "Bob"', 12.5], ["a\nb", 1]])).toBe('Name,Amount\r\n"Smith, ""Bob""",12.5\r\n"a\nb",1');
  });
});
