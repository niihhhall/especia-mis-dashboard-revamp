// Book to Bank engine, cash-flow reconciliation from profit to closing bank
// balance. Nine fixed sections, always in this order, every company: Summary,
// Bank & OD Balances, Current Liabilities, Current Assets, Loan/Liability,
// Change in Capital, Fixed Assets, Investments, Branch Balances. A section a
// company has no data for simply renders with nothing under it (or, for the
// two per-company sections below, doesn't render at all), never merged,
// never reordered. Confirmed against seven real client reference workbooks
// this shape is a safe universal default: the underlying formula for a line
// never depends on which section it's grouped under, only presentation does.
//
// Working-capital movements use opening − closing (equivalently credit −
// debit), so they are unaffected by the Sundry Creditors sign anomaly.
//
// Sundry Debtors, Sundry Creditors, Opening Stock, Cash/Bank/OD, Fixed Assets,
// Capital A/c and Unsecured Loans are universal Schedule-III concepts common
// to virtually every business, so they're computed directly here, not
// templated, and always shown even at zero. Investments and Branch Balances
// are common enough to warrant their own fixed section, but genuinely absent
// for many companies (no investment ledger, single branch), those come from
// the template's `btb_investment`/`btb_branch` sections and simply don't
// render when a company has no lines in them.
//
// Loan/Liability, Change in Capital and Fixed Assets each still anchor on
// their universal line (Unsecured Loans / Capital A/c / Fixed Assets), but a
// company can ALSO add its own `btb_loan_liability`/`btb_capital`/
// `btb_fixed_asset` template lines for a distinct particular (a named
// secured loan, a separate capital contribution, a separately-tracked
// asset) that shouldn't be folded into the universal total, the exact same
// additive pattern `btb_current_liability`/`btb_current_asset` already use
// alongside Sundry Creditors/Debtors.

import type { TemplateLine } from "./catalog";
import { computePnl, groupIndex } from "./pnl";
import type { ManualInputs, MasterRow, StatementLine } from "./types";

export interface BtbItem {
  key: string;
  label: string;
  value: number;
}

export interface WaterfallStep {
  label: string;
  value: number;
  type: "start" | "add" | "less" | "end";
}

export interface BookToBankResult {
  profit: number;
  workingCapitalChange: number;
  operatingProfitAvailable: number;
  loanChange: number;
  capitalChange: number;
  fixedAssetChange: number;
  investmentChange: number;
  branchChange: number;
  withdrawableCash: number;
  openingCash: number;
  closingCash: number;
  difference: number;
  /** Bank & OD Balances' own "Check (must = 0)" row, the residual between
   * the TB's actual cash movement and every driver this engine accounts
   * for. Identical figure to the waterfall's "Other movements" step. */
  bankCheck: number;
  currentLiabilities: BtbItem[];
  totalCurrentLiabilities: number;
  currentAssets: BtbItem[];
  totalCurrentAssets: number;
  /** Unsecured Loans plus any per-company `btb_loan_liability` lines. */
  loanDetail: BtbItem[];
  /** Capital A/c plus any per-company `btb_capital` lines. */
  capitalDetail: BtbItem[];
  investmentDetail: BtbItem[];
  branchDetail: BtbItem[];
  faPurchase: number;
  faSale: number;
  /** Extra per-company `btb_fixed_asset` lines, beyond faPurchase/faSale. */
  fixedAssetDetail: BtbItem[];
  waterfall: WaterfallStep[];
}

export function computeBookToBank(
  master: MasterRow[],
  manual: ManualInputs,
  template: TemplateLine[],
): BookToBankResult {
  const { sumClosing, sumOpening, sumDebit, sumCredit } = groupIndex(master);
  const num = (v: number | undefined) => (typeof v === "number" ? v : undefined);
  const mvt = (g: string) => sumOpening(g) - sumClosing(g); // opening − closing

  const ebt = computePnl(master, manual, template).totals.ebt;
  const openingStock = sumOpening("Opening Stock");
  const closingStock = num(manual.closingStock) ?? 0;

  // Current liabilities, a decrease frees cash (positive). Universal Sundry
  // Creditors first, then whatever per-company detail lines the template
  // defines, each a pure opening-minus-closing movement, matching the
  // reference workbook's Book to Bank sheet exactly (no Employee Benefit
  // Expense folded in here, that was never in the reference formula and
  // was double-counting against EBT, which already carries the full
  // Employee Benefit Expense as a P&L expense).
  const liabilityLines = template.filter((l) => l.section === "btb_current_liability");
  const currentLiabilities: BtbItem[] = [
    { key: "sundryCreditors", label: "Sundry Creditors", value: mvt("Sundry Creditors") },
    ...liabilityLines.map((l) => ({ key: l.key, label: l.label, value: mvt(l.grouping ?? "") })),
  ];
  const totalCurrentLiabilities = currentLiabilities.reduce((a, x) => a + x.value, 0);

  // Current assets, an increase consumes cash (negative).
  const assetLines = template.filter((l) => l.section === "btb_current_asset");
  const currentAssets: BtbItem[] = [
    { key: "sundryDebtors", label: "Sundry Debtors", value: -mvt("Sundry Debtors") },
    { key: "inventories", label: "Inventories", value: -(openingStock - closingStock) },
    ...assetLines.map((l) => ({ key: l.key, label: l.label, value: -mvt(l.grouping ?? "") })),
  ];
  const totalCurrentAssets = currentAssets.reduce((a, x) => a + x.value, 0);

  const workingCapitalChange = -(totalCurrentAssets - totalCurrentLiabilities);
  const operatingProfitAvailable = ebt + workingCapitalChange;

  // Loan and Capital are each anchored by a universal grouping (Unsecured
  // Loans / Capital A/c, always present, never templated), each now its
  // own section, having previously shared one combined "Loan / capital
  // changes" section. A company can ALSO add its own `btb_loan_liability`/
  // `btb_capital` template lines for a distinct particular (a named secured
  // loan, a separate capital contribution) that shouldn't be folded into
  // the universal line, same additive pattern `btb_current_liability`
  // already uses alongside Sundry Creditors. Both sections still feed
  // `withdrawableCash` exactly as before, just with more lines summed in.
  const loanLines = template.filter((l) => l.section === "btb_loan_liability");
  const loanDetail: BtbItem[] = [
    { key: "unsecured", label: "Unsecured Loans", value: mvt("Unsecured Loans") },
    ...loanLines.map((l) => ({ key: l.key, label: l.label, value: mvt(l.grouping ?? "") })),
  ];
  const loanChange = loanDetail.reduce((a, x) => a + x.value, 0);

  const capitalLines = template.filter((l) => l.section === "btb_capital");
  const capitalDetail: BtbItem[] = [
    { key: "capitalAc", label: "Capital A/c", value: mvt("Capital A/c") },
    ...capitalLines.map((l) => ({ key: l.key, label: l.label, value: mvt(l.grouping ?? "") })),
  ];
  const capitalChange = capitalDetail.reduce((a, x) => a + x.value, 0);

  const faPurchase = sumDebit("Fixed Assets");
  const faSale = sumCredit("Fixed Assets");
  // Same asset-side convention as Current Assets/Investments: an increase
  // consumes cash, so an extra fixed-asset particular displays as `-mvt`.
  const fixedAssetLines = template.filter((l) => l.section === "btb_fixed_asset");
  const fixedAssetDetail: BtbItem[] = fixedAssetLines.map((l) => ({
    key: l.key,
    label: l.label,
    value: -mvt(l.grouping ?? ""),
  }));
  // Subtract, not add: `fixedAssetDetail`'s values are stored in "positive =
  // balance grew" display convention (same as Current Assets/Investments
  // above), but `faSale - faPurchase` is already in "positive = cash in"
  // terms, adding a positive "grew" value would overstate cash instead of
  // reducing it. Same reasoning as Investments/Branch getting subtracted at
  // their own point of use below, just applied at the point of definition
  // here since Fixed Assets' own baseline isn't display-convention already.
  const fixedAssetChange = faSale - faPurchase - fixedAssetDetail.reduce((a, x) => a + x.value, 0);

  // Investments and Branch Balances: per-company template sections, same
  // asset-side sign convention as Current Assets, each line displays as
  // "-mvt" (an increase reads positive, matching every reference workbook's
  // own Investments/Branch rows), and, same as Current Assets' own
  // aggregate-then-negate step via `workingCapitalChange`, that display
  // total gets negated once when it feeds Withdrawable Cash, because an
  // increase in either actually consumes cash. Confirmed against Royal
  // Enterprise's real, already-verified Withdrawable Cash (−31,49,889.79):
  // naively adding the positive display total instead of subtracting it
  // was off by exactly 2× the Branch figure. Previously these ledgers had
  // no home of their own and got folded into `btb_current_asset`; each
  // company's template lines were moved out of there and into
  // `btb_investment`/`btb_branch` so nothing gets summed twice.
  const investmentLines = template.filter((l) => l.section === "btb_investment");
  const investmentDetail: BtbItem[] = investmentLines.map((l) => ({ key: l.key, label: l.label, value: -mvt(l.grouping ?? "") }));
  const investmentChange = investmentDetail.reduce((a, x) => a + x.value, 0);

  const branchLines = template.filter((l) => l.section === "btb_branch");
  const branchDetail: BtbItem[] = branchLines.map((l) => ({ key: l.key, label: l.label, value: -mvt(l.grouping ?? "") }));
  const branchChange = branchDetail.reduce((a, x) => a + x.value, 0);

  const withdrawableCash =
    operatingProfitAvailable + loanChange + capitalChange + fixedAssetChange - investmentChange - branchChange;

  const openingCash = sumOpening("Cash, Bank & OD");
  const closingCash = sumClosing("Cash, Bank & OD");
  const difference = closingCash - openingCash;

  // Waterfall that closes to actual closing cash; any unexplained residual
  // (e.g. cash drawings) is bucketed as "Other movements", identical figure
  // to Bank & OD Balances' own "Check (must = 0)" row.
  const drivers =
    ebt + workingCapitalChange + loanChange + capitalChange + fixedAssetChange - investmentChange - branchChange;
  const other = difference - drivers;
  const bankCheck = other;
  const step = (label: string, value: number): WaterfallStep => ({
    label,
    value,
    type: value >= 0 ? "add" : "less",
  });
  const waterfall: WaterfallStep[] = [
    { label: "Opening Cash", value: openingCash, type: "start" },
    step("Net Profit (EBT)", ebt),
    step("Working Capital", workingCapitalChange),
    step("Loans (net)", loanChange),
    step("Capital (net)", capitalChange),
    step("Fixed Assets", fixedAssetChange),
    step("Investments", -investmentChange),
    step("Branch", -branchChange),
    step("Other movements", other),
    { label: "Closing Cash", value: closingCash, type: "end" },
  ];

  return {
    profit: ebt,
    workingCapitalChange,
    operatingProfitAvailable,
    loanChange,
    capitalChange,
    fixedAssetChange,
    investmentChange,
    branchChange,
    withdrawableCash,
    openingCash,
    closingCash,
    difference,
    bankCheck,
    currentLiabilities,
    totalCurrentLiabilities,
    currentAssets,
    totalCurrentAssets,
    loanDetail,
    capitalDetail,
    investmentDetail,
    branchDetail,
    faPurchase,
    faSale,
    fixedAssetDetail,
    waterfall,
  };
}

/**
 * The statement as an ordered, sectioned line list, the same grammar as
 * `PnlResult.lines`, so the Book to Bank table can share the P&L table's
 * multi-month/YTD row-merging logic. Every value here is a monthly flow (a
 * movement, not a balance), so, unlike the P&L's opening/closing stock -
 * summing these across months for a YTD column is always correct; no
 * special-casing needed.
 */
export function bookToBankLines(b: BookToBankResult): StatementLine[] {
  const detail = (items: BtbItem[]): StatementLine[] =>
    items.map((i) => ({ key: i.key, label: i.label, value: i.value }));

  // Summary line keys are prefixed "sm-" so they can never collide with a
  // per-company template line's own free-text `key`, a real bug caught
  // live: an unprefixed "capital" here collided with Change in Capital's
  // own detail-row key and silently corrupted `mergeRows`' row order.
  const lines: StatementLine[] = [
    // I, Summary
    { key: "s-summary", label: "Summary", value: 0, emphasis: "section" },
    { key: "sm-profit", label: "Profit for the period (EBT)", value: b.profit },
    { key: "sm-wc", label: "Working Capital (Increase)/Decrease", value: b.workingCapitalChange },
    { key: "sm-opa", label: "Operating Profit Available", value: b.operatingProfitAvailable, emphasis: "subtotal" },
    { key: "sm-loan", label: "Loan (Decrease)/Increase", value: b.loanChange },
    { key: "sm-capital", label: "Capital (Decrease)/Increase", value: b.capitalChange },
    { key: "sm-fa", label: "Fixed Asset (Increase)/Decrease", value: b.fixedAssetChange },
  ];
  if (b.investmentDetail.length > 0) {
    lines.push({ key: "sm-investment", label: "Investment (Increase)/Decrease", value: b.investmentChange });
  }
  if (b.branchDetail.length > 0) {
    lines.push({ key: "sm-branch", label: "Branch (Increase)/Decrease", value: b.branchChange });
  }
  lines.push({ key: "sm-wd", label: "Withdrawable Cash", value: b.withdrawableCash, emphasis: "total" });

  // II, Bank & OD Balances
  lines.push(
    { key: "s-bank", label: "Bank & OD Balances", value: 0, emphasis: "section" },
    { key: "bank-closing", label: "Closing Balance: Cash & Bank (derived)", value: b.closingCash },
    { key: "bank-opening", label: "Opening Balance: Cash & Bank (per TB)", value: b.openingCash },
    { key: "bank-net", label: "Net Movement (Closing − Opening)", value: b.difference },
    { key: "bank-check", label: "Check (must = 0)", value: b.bankCheck },
  );

  // III, Current Liabilities
  lines.push(
    { key: "s-cl", label: "Current Liabilities", value: 0, emphasis: "section" },
    ...detail(b.currentLiabilities),
    { key: "cl-total", label: "Total Current Liabilities", value: b.totalCurrentLiabilities, emphasis: "subtotal" },
  );

  // IV, Current Assets
  lines.push(
    { key: "s-ca", label: "Current Assets", value: 0, emphasis: "section" },
    ...detail(b.currentAssets),
    { key: "ca-total", label: "Total Current Assets", value: b.totalCurrentAssets, emphasis: "subtotal" },
  );

  // V, Loan / Liability
  lines.push(
    { key: "s-loan", label: "Loan / Liability", value: 0, emphasis: "section" },
    ...detail(b.loanDetail),
    { key: "loan-total", label: "Total Loan / Liability", value: b.loanChange, emphasis: "subtotal" },
  );

  // VI, Change in Capital
  lines.push(
    { key: "s-capital", label: "Change in Capital", value: 0, emphasis: "section" },
    ...detail(b.capitalDetail),
    { key: "capital-total", label: "Net Change in Capital", value: b.capitalChange, emphasis: "subtotal" },
  );

  // VII, Fixed Assets
  lines.push(
    { key: "s-fa", label: "Fixed Assets", value: 0, emphasis: "section" },
    { key: "fap", label: "Purchase of fixed assets", value: b.faPurchase },
    { key: "fas", label: "Sale of fixed assets", value: b.faSale },
    ...detail(b.fixedAssetDetail),
    { key: "fa-net", label: "Net (Increase)/Decrease", value: b.fixedAssetChange, emphasis: "subtotal" },
  );

  // VIII, Investments (only when this company has any)
  if (b.investmentDetail.length > 0) {
    lines.push(
      { key: "s-inv", label: "Investments", value: 0, emphasis: "section" },
      ...detail(b.investmentDetail),
      { key: "inv-total", label: "Total Investments", value: b.investmentChange, emphasis: "subtotal" },
    );
  }

  // IX, Branch Balances (only when this company has any)
  if (b.branchDetail.length > 0) {
    lines.push(
      { key: "s-branch", label: "Branch Balances", value: 0, emphasis: "section" },
      ...detail(b.branchDetail),
      { key: "branch-total", label: "Total Branch Balance", value: b.branchChange, emphasis: "subtotal" },
    );
  }

  return lines;
}
