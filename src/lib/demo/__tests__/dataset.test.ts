import { describe, expect, it } from "vitest";

import { computeBookToBank } from "../../mis/book-to-bank";
import { sameFy } from "../../mis/period";
import { computePnl } from "../../mis/pnl";
import {
  DEMO_PERIOD_IDS,
  getDemoAgeing,
  getDemoLedgerMap,
  getDemoManualInputs,
  getDemoMasterRows,
  getDemoPeriods,
  getDemoTemplateRows,
} from "../dataset";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const periods = getDemoPeriods();
const template = getDemoTemplateRows();

describe("demo dataset", () => {
  it("has three published periods, newest first, in one financial year", () => {
    expect(periods.map((p) => p.id)).toEqual([DEMO_PERIOD_IDS.jun, DEMO_PERIOD_IDS.may, DEMO_PERIOD_IDS.apr]);
    expect(periods.every((p) => p.status === "published")).toBe(true);
    for (const p of periods) expect(sameFy(p.month, periods[0].month, 4)).toBe(true);
  });

  describe.each(periods.map((p) => [p.label, p.id] as const))("%s", (_label, periodId) => {
    const rows = getDemoMasterRows(periodId);
    const manual = getDemoManualInputs(periodId);

    it("balances every row and the whole trial balance", () => {
      expect(rows.length).toBeGreaterThan(30);
      for (const r of rows) expect(Math.abs(r.opening + r.debit - r.credit - r.closing)).toBeLessThan(0.01);
      expect(Math.abs(sum(rows.map((r) => r.opening)))).toBeLessThan(0.01);
      expect(Math.abs(sum(rows.map((r) => r.closing)))).toBeLessThan(0.01);
    });

    it("shows positive revenue, gross profit and EBT", () => {
      const { totals } = computePnl(rows, manual, template);
      expect(totals.revenue).toBeGreaterThan(0);
      expect(totals.grossProfit).toBeGreaterThan(0);
      expect(totals.ebt).toBeGreaterThan(0);
    });

    it("reconciles Book to Bank to zero", () => {
      expect(Math.abs(computeBookToBank(rows, manual, template).bankCheck)).toBeLessThan(0.01);
    });

    it("ties ageing totals to Sundry Debtors / Sundry Creditors", () => {
      const closing = (g: string) => sum(rows.filter((r) => r.grouping === g).map((r) => r.closing));
      const debtors = getDemoAgeing(periodId, "debtor");
      const creditors = getDemoAgeing(periodId, "creditor");
      expect(debtors).toHaveLength(6);
      expect(creditors).toHaveLength(6);
      expect(sum(debtors.map((e) => e.total))).toBeCloseTo(closing("Sundry Debtors"), 2);
      expect(sum(creditors.map((e) => e.total))).toBeCloseTo(Math.abs(closing("Sundry Creditors")), 2);
      for (const e of [...debtors, ...creditors]) {
        expect(e.b0_30 + e.b30_60 + e.b60_90 + e.b90_180 + e.b180_plus).toBeCloseTo(e.total, 2);
      }
    });
  });

  it("flags exactly two unmapped ledgers in Jun'26, none of them in the ledger map", () => {
    const mapped = new Set(getDemoLedgerMap().map((m) => m.ledger));
    const unmapped = getDemoMasterRows(DEMO_PERIOD_IDS.jun).filter((r) => r.unmapped);
    expect(unmapped).toHaveLength(2);
    for (const r of unmapped) expect(mapped.has(r.particulars)).toBe(false);
    for (const id of [DEMO_PERIOD_IDS.apr, DEMO_PERIOD_IDS.may]) {
      expect(getDemoMasterRows(id).every((r) => mapped.has(r.particulars))).toBe(true);
    }
  });

  it("returns fresh copies and empty values for unknown periods", () => {
    const a = getDemoMasterRows(DEMO_PERIOD_IDS.apr);
    a[0].closing = 1;
    expect(getDemoMasterRows(DEMO_PERIOD_IDS.apr)[0].closing).not.toBe(1);
    expect(getDemoMasterRows("nope")).toEqual([]);
    expect(getDemoManualInputs("nope")).toEqual({});
  });
});
