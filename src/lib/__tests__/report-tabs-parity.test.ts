import { describe, expect, it } from "vitest";
import { REPORT_TABS, visibleReportTabs, withChannelTabs } from "../report-tabs";

/**
 * Content parity for the report tab bar. The fixture below was captured from
 * the code before the premium redesign started. Labels are compared
 * lower-cased so the approved sentence case pass keeps this green; hrefs and
 * order must never change.
 */
type Row = [label: string, href: string];

const rows = (tabs: { label: string; href: string }[]): Row[] =>
  tabs.map((t) => [t.label.toLowerCase(), t.href]);

const ALL: Row[] = [
  ["consolidated", "/dashboard"],
  ["gp dashboard", "/gp-dashboard"],
  ["p&l detail", "/pnl"],
  ["segment p&l", "/segment"],
  ["book to bank", "/book-to-bank"],
  ["cash conversion", "/cash-conversion"],
  ["debtors", "/debtors"],
  ["creditors", "/creditors"],
  ["budget vs actual", "/budget-vs-actual"],
  ["charts", "/charts"],
];

const WITHOUT_SEGMENT: Row[] = ALL.filter(([, href]) => href !== "/segment");

const GROUPS = [
  { id: "g1", label: "B2C" },
  { id: "g2", label: "B2B" },
];

describe("report tabs content parity", () => {
  it("REPORT_TABS", () => {
    expect(rows(REPORT_TABS)).toEqual(ALL);
  });

  it("visibleReportTabs(true)", () => {
    expect(rows(visibleReportTabs(true))).toEqual(ALL);
  });

  it("visibleReportTabs(false)", () => {
    expect(rows(visibleReportTabs(false))).toEqual(WITHOUT_SEGMENT);
  });

  it("withChannelTabs with no channel groups keeps the base list", () => {
    const config = { pnl: "group", book_to_bank: "group", ccc: "group", segment: "group" } as const;
    expect(rows(withChannelTabs(REPORT_TABS, [], config))).toEqual(ALL);
  });

  it("withChannelTabs at consolidated depth keeps the base list", () => {
    const config = {
      pnl: "consolidated",
      book_to_bank: "consolidated",
      ccc: "consolidated",
      segment: "consolidated",
    } as const;
    expect(rows(withChannelTabs(REPORT_TABS, GROUPS, config))).toEqual(ALL);
  });

  it("withChannelTabs splits P&L, cash conversion and segment per channel", () => {
    const config = { pnl: "group", book_to_bank: "branch", ccc: "branch", segment: "group" } as const;
    expect(rows(withChannelTabs(REPORT_TABS, GROUPS, config))).toEqual([
      ["consolidated", "/dashboard"],
      ["gp dashboard", "/gp-dashboard"],
      ["b2c p&l", "/pnl?scope=group:g1"],
      ["b2b p&l", "/pnl?scope=group:g2"],
      ["b2c segment p&l", "/segment?scope=group:g1"],
      ["b2b segment p&l", "/segment?scope=group:g2"],
      ["book to bank", "/book-to-bank"],
      ["b2c cash conversion", "/cash-conversion?scope=group:g1"],
      ["b2b cash conversion", "/cash-conversion?scope=group:g2"],
      ["debtors", "/debtors"],
      ["creditors", "/creditors"],
      ["budget vs actual", "/budget-vs-actual"],
      ["charts", "/charts"],
    ]);
  });

  it("withChannelTabs splits only the reports at group or branch depth", () => {
    const config = { pnl: "consolidated", book_to_bank: "group", ccc: "group", segment: "consolidated" } as const;
    expect(rows(withChannelTabs(visibleReportTabs(false), GROUPS, config))).toEqual([
      ["consolidated", "/dashboard"],
      ["gp dashboard", "/gp-dashboard"],
      ["p&l detail", "/pnl"],
      ["book to bank", "/book-to-bank"],
      ["b2c cash conversion", "/cash-conversion?scope=group:g1"],
      ["b2b cash conversion", "/cash-conversion?scope=group:g2"],
      ["debtors", "/debtors"],
      ["creditors", "/creditors"],
      ["budget vs actual", "/budget-vs-actual"],
      ["charts", "/charts"],
    ]);
  });
});
