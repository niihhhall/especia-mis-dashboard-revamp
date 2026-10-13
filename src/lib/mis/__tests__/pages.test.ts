import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseTrialBalance } from "../../ingest/parse-workbook";
import { normalizeTrialBalance } from "../../ingest/normalize";
import { deriveCreditNatureGroupings, type SegmentDef, type TemplateLine } from "../catalog";
import { computeBookToBank } from "../book-to-bank";
import { computeCcc } from "../ccc";
import { computeSegment } from "../segment";
import type { LedgerMapEntry, ManualInputs } from "../types";
import seedMap from "../seed/ledger-map.tirupati.json";
import tirupatiTemplate from "./fixtures/tirupati.template.json";

const fx = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)));

const TEMPLATE = tirupatiTemplate.template as TemplateLine[];
const SEGMENTS = tirupatiTemplate.segments as SegmentDef[];
const CREDIT_NATURE_GROUPINGS = deriveCreditNatureGroupings(TEMPLATE);

const MANUAL: ManualInputs = {
  accessoriesSales: 1977513.81,
  otherSales: 6214935.7,
  discountReceived: 1092,
  employeeBenefitExpense: 756842,
  closingStock: 53427016.35,
  cashSalary: 437361,
  depreciation: 0,
  interestExpense: 648343,
  segmentOpeningStock: { vehicle: 45211524.87, accessories: 13485212.59, service: 0 },
  segmentClosingStock: { vehicle: 39472424.72, accessories: 13954591.93, service: 0 },
};

const parsed = parseTrialBalance(fx("Tirupati_Trial.xlsx"));
const { rows } = normalizeTrialBalance(parsed, seedMap as LedgerMapEntry[], CREDIT_NATURE_GROUPINGS);
const close = (a: number, b: number, tol = 1) =>
  expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tol);

describe("Segment P&L vs workbook (Apr'26)", () => {
  const seg = computeSegment(rows, MANUAL, SEGMENTS);
  const by = Object.fromEntries(seg.segments.map((s) => [s.name, s]));

  it("matches revenue, COGS and gross profit per segment", () => {
    close(by["Vehicle Sales"].revenue, 68660299.42);
    close(by["Vehicle Sales"].cogs, 65042615.04);
    close(by["Vehicle Sales"].grossProfit, 3617684.38);
    close(by["Accessories Sales"].grossProfit, -1798851.99);
    close(by["Service"].grossProfit, 5712077.86);
    close(seg.total.grossProfit, 7530910.25, 2);
  });

  it("allocates rent by revenue share", () => {
    close(by["Vehicle Sales"].rent, 385681.08);
    close(seg.total.rent, 431700);
  });
});

describe("Book to Bank vs workbook (Apr'26)", () => {
  const b = computeBookToBank(rows, MANUAL, TEMPLATE);
  const cl = Object.fromEntries(b.currentLiabilities.map((x) => [x.key, x.value]));
  const ca = Object.fromEntries(b.currentAssets.map((x) => [x.key, x.value]));

  it("matches the summary block", () => {
    close(b.profit, 2279579.75);
    close(b.workingCapitalChange, -6883743.96);
    close(b.operatingProfitAvailable, -4604164.21);
    close(b.loanChange, 5811434);
    close(b.fixedAssetChange, -968749);
    close(b.withdrawableCash, 238520.79);
    close(b.openingCash, -71833364.96);
    close(b.closingCash, -70400641.17);
  });

  it("matches working-capital detail", () => {
    close(cl.sundryCreditors, 4792802.01);
    close(cl.dutiesLiab, -4485397.81);
    // Pure opening-minus-closing movement — the reference workbook's Book to
    // Bank sheet does not fold Employee Benefit Expense into this line (see
    // book-to-bank.ts).
    close(cl.otherCL, -1166265);
    close(b.totalCurrentLiabilities, -1213002.8);
    close(ca.sundryDebtors, 10928214.12);
    close(ca.inventories, -5269721.11);
    close(b.totalCurrentAssets, 5670741.16);
  });

  it("waterfall closes to closing cash", () => {
    const sum = b.waterfall.filter((s) => s.type !== "end").reduce((a, s) => a + s.value, 0);
    close(sum, b.closingCash);
  });
});

describe("Cash Conversion Cycle (Apr'26)", () => {
  // A single-month fixture is its own FY-to-date — computeCcc needs the FY
  // run, and with n=1 that run is just this one month.
  const c = computeCcc([{ master: rows, manual: MANUAL }], TEMPLATE);

  it("matches debtor and inventory days (workbook)", () => {
    close(c.dcp, 2);
    close(c.icp, 25);
    close(Math.round(c.debtorTurnover), 220);
    close(Math.round(c.inventoryTurnover), 15);
  });

  it("matches the legacy Excel creditor treatment (CPP −2 / CCC 29)", () => {
    // Creditors taken on the liability side (negative), per the source MIS.
    expect(c.closingCreditors).toBeLessThan(0);
    close(c.cpp, -2);
    close(c.ccc, 29);
  });
});
