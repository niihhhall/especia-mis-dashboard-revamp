import { describe, expect, it } from "vitest";

import { parseQuarters, planColumns, quarterLabel, quarterOf, quartersWithData, type Quarter } from "../quarters";
import { buildYtd } from "../ytd";

const months = ["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"];

describe("quarterOf", () => {
  it("counts quarters from an April FY start", () => {
    const got = ["2026-04-01", "2026-06-01", "2026-07-01", "2026-09-01", "2026-10-01", "2026-12-01", "2027-01-01", "2027-03-01"].map((m) => quarterOf(m));
    expect(got).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it("follows a company whose FY starts in another month", () => {
    expect(quarterOf("2026-01-01", 1)).toBe(1);
    expect(quarterOf("2026-04-01", 1)).toBe(2);
    expect(quarterOf("2026-07-01", 7)).toBe(1);
    expect(quarterOf("2027-06-01", 7)).toBe(4);
  });
});

describe("parseQuarters", () => {
  it("reads, sorts and dedupes; ignores junk", () => {
    expect(parseQuarters("2,1,2")).toEqual([1, 2]);
    expect(parseQuarters("5,x,,3")).toEqual([3]);
    expect(parseQuarters(undefined)).toEqual([]);
    expect(parseQuarters("")).toEqual([]);
  });
});

describe("planColumns", () => {
  const plan = (sel: Quarter[]) =>
    planColumns(months, (m) => m, sel).map((p) => (p.kind === "month" ? p.item.slice(0, 7) : `Q${p.quarter}[${p.items.length}]`));
  it("is plain month-by-month when nothing is picked", () => {
    expect(plan([])).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
  });
  it("folds a picked quarter into one column and leaves the rest monthly", () => {
    expect(plan([1])).toEqual(["Q1[3]", "2026-07", "2026-08"]);
  });
  it("folds several quarters, a partial one included", () => {
    expect(plan([1, 2])).toEqual(["Q1[3]", "Q2[2]"]);
  });
  it("can fold a later quarter and keep earlier months", () => {
    expect(plan([2])).toEqual(["2026-04", "2026-05", "2026-06", "Q2[2]"]);
  });
  it("ignores a picked quarter with no months on file", () => {
    expect(plan([3, 4])).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
  });
});

describe("labels and availability", () => {
  it("marks a partial quarter", () => {
    expect(quarterLabel(1, 3)).toBe("Q1");
    expect(quarterLabel(2, 2)).toBe("Q2 (2 of 3 months)");
    expect(quarterLabel(2, 1)).toBe("Q2 (1 of 3 months)");
  });
  it("knows which quarters have data", () => {
    expect([...quartersWithData(months, (m) => m)].sort()).toEqual([1, 2]);
  });
});

describe("quarter roll-up keeps balances as balances", () => {
  const month = (open: number, close: number, flow: number) => [
    { key: "revenue", label: "Revenue", value: flow, ratio: 1 },
    { key: "openingStock", label: "Opening Stock", value: open },
    { key: "closingStock", label: "Closing Stock", value: close },
    { key: "bank-opening", label: "Opening", value: open },
    { key: "bank-closing", label: "Closing", value: close },
  ];
  const q = [month(100, 120, 10), month(120, 150, 20), month(150, 130, 30)];
  it("P&L: flows add, opening stock is the first month's, closing stock the last month's", () => {
    const r = Object.fromEntries(buildYtd(q).map((l) => [l.key, l.value]));
    expect(r.revenue).toBe(60);
    expect(r.openingStock).toBe(100);
    expect(r.closingStock).toBe(130);
  });
  it("Book to Bank: opening / closing cash follow the same rule when told which keys are balances", () => {
    const r = Object.fromEntries(buildYtd(q, { first: ["bank-opening"], last: ["bank-closing"] }).map((l) => [l.key, l.value]));
    expect(r["bank-opening"]).toBe(100);
    expect(r["bank-closing"]).toBe(130);
  });
});
