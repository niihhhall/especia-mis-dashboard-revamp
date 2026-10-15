import { describe, expect, it } from "vitest";

import { computeBookToBank } from "../book-to-bank";
import type { TemplateLine } from "../catalog";
import type { ManualInputs, MasterRow } from "../types";

// Deterministic, synthetic-data tests for the three Book to Bank sections
// that used to be 100% hardcoded to one universal line each (Loan/Liability,
// Change in Capital, Fixed Assets) and now also accept per-company detail
// lines, see catalog.ts's `btb_loan_liability`/`btb_capital`/
// `btb_fixed_asset` sections and book-to-bank.ts's own top-of-file comment.
// No real reference workbook exercises this yet (it shipped with zero
// companies using it), so these are hand-computed rather than oracle-matched
//, that's also exactly why a sign bug in the Fixed Assets math shipped
// unnoticed: the one live check done before deploy used a company with no
// real ledger behind the test line, so it read zero either way.

const row = (over: Partial<MasterRow>): MasterRow => ({
  grouping: "",
  bsPl: "B.S",
  particulars: "",
  classification: "",
  opening: 0,
  debit: 0,
  credit: 0,
  closing: 0,
  ...over,
});

const MANUAL: ManualInputs = {};

describe("Book to Bank: Loan/Liability, Change in Capital, Fixed Assets extensibility", () => {
  const template: TemplateLine[] = [
    { section: "btb_loan_liability", sortOrder: 1, kind: "grouping", key: "securedLoan", label: "Secured Loan", grouping: "Secured Loan" },
    { section: "btb_capital", sortOrder: 1, kind: "grouping", key: "newCapital", label: "New Capital", grouping: "New Capital" },
    { section: "btb_fixed_asset", sortOrder: 1, kind: "grouping", key: "extraMachinery", label: "Extra Machinery", grouping: "Extra Machinery" },
  ];

  const rows: MasterRow[] = [
    // Universal Unsecured Loans: loan increased 100 -> 150 (credit-nature, more negative).
    row({ grouping: "Unsecured Loans", particulars: "Unsecured Loans", opening: -100, credit: 50, closing: -150 }),
    // Extra per-company loan line: increased 20 -> 50.
    row({ grouping: "Secured Loan", particulars: "Secured Loan", opening: -20, credit: 30, closing: -50 }),
    // Universal Capital A/c: unchanged this period.
    row({ grouping: "Capital A/c", particulars: "Capital A/c", opening: -1000, closing: -1000 }),
    // Extra per-company capital line: a fresh 200 contribution.
    row({ grouping: "New Capital", particulars: "New Capital", credit: 200, closing: -200 }),
    // Universal Fixed Assets: bought 500, sold 100 (debit/credit based, not mvt).
    row({ grouping: "Fixed Assets", particulars: "Fixed Assets", debit: 500, credit: 100, closing: 400 }),
    // Extra per-company fixed-asset line: bought 200 more (debit-nature, balance grew).
    row({ grouping: "Extra Machinery", particulars: "Extra Machinery", debit: 200, closing: 200 }),
  ];

  const b = computeBookToBank(rows, MANUAL, template);

  it("Loan/Liability: sums the universal line plus every extra particular", () => {
    expect(b.loanDetail).toHaveLength(2);
    expect(b.loanDetail.find((x) => x.key === "unsecured")?.value).toBeCloseTo(50); // loan grew 100->150
    expect(b.loanDetail.find((x) => x.key === "securedLoan")?.value).toBeCloseTo(30); // grew 20->50
    expect(b.loanChange).toBeCloseTo(80); // 50 + 30
  });

  it("Change in Capital: sums the universal line plus every extra particular", () => {
    expect(b.capitalDetail).toHaveLength(2);
    expect(b.capitalDetail.find((x) => x.key === "capitalAc")?.value).toBeCloseTo(0); // unchanged
    expect(b.capitalDetail.find((x) => x.key === "newCapital")?.value).toBeCloseTo(200); // fresh 200 contribution
    expect(b.capitalChange).toBeCloseTo(200);
  });

  it("Fixed Assets: an extra particular that GREW reduces the cash-positive total, not increases it", () => {
    expect(b.fixedAssetDetail).toHaveLength(1);
    // Display convention (matches Current Assets/Investments): positive = balance grew.
    expect(b.fixedAssetDetail[0].value).toBeCloseTo(200);
    // faSale(100) - faPurchase(500) = -400 from the universal line alone; the
    // extra 200-worth purchase must make this MORE negative (more cash
    // spent), never less, this is the exact case the earlier sign bug got
    // backwards (it added +200 instead of subtracting it, landing on -200).
    expect(b.fixedAssetChange).toBeCloseTo(-600);
  });

  it("Withdrawable Cash folds all three sections with the correct sign", () => {
    // operatingProfitAvailable is 0 here (empty P&L, no working-capital
    // lines), isolates just loan + capital + fixed-asset for this check.
    expect(b.operatingProfitAvailable).toBeCloseTo(0);
    expect(b.withdrawableCash).toBeCloseTo(b.loanChange + b.capitalChange + b.fixedAssetChange);
    expect(b.withdrawableCash).toBeCloseTo(80 + 200 - 600); // -320
  });
});

describe("Book to Bank: same three sections with zero extra particulars (regression guard)", () => {
  // No template lines at all for these sections, every existing company
  // today. Confirms the additive change is a strict no-op when a company
  // hasn't used the new sections, matching every pinned-fixture company's
  // already-passing figures elsewhere in this suite.
  const rows: MasterRow[] = [
    row({ grouping: "Unsecured Loans", particulars: "Unsecured Loans", opening: -100, credit: 50, closing: -150 }),
    row({ grouping: "Capital A/c", particulars: "Capital A/c", opening: -1000, closing: -1000 }),
    row({ grouping: "Fixed Assets", particulars: "Fixed Assets", debit: 500, credit: 100, closing: 400 }),
  ];
  const b = computeBookToBank(rows, MANUAL, []);

  it("matches the universal-only figures with no extra lines", () => {
    expect(b.loanDetail).toHaveLength(1);
    expect(b.loanChange).toBeCloseTo(50);
    expect(b.capitalDetail).toHaveLength(1);
    expect(b.capitalChange).toBeCloseTo(0);
    expect(b.fixedAssetDetail).toHaveLength(0);
    expect(b.fixedAssetChange).toBeCloseTo(-400); // faSale(100) - faPurchase(500)
  });
});
