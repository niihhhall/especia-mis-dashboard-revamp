// Cash Conversion Cycle engine. Mirrors the reference workbook's "CCC" sheet
// exactly — confirmed cell-by-cell, not just concept-by-concept:
//
//   Turnover  = (YTD flow ÷ months elapsed × 12) ÷ Average balance
//   Average balance = (FY-opening balance + this month's own closing) ÷ 2
//   Period (days) = 365 ÷ Turnover
//   CCC = DCP + ICP − CPP
//
// Two things are easy to get wrong here, both confirmed against the reference:
//  - The balance denominator is NOT this month's closing alone — it's averaged
//    against the balance on the FIRST day of the financial year, every month.
//    A single April upload IS its own FY-opening, so this only matters once
//    May's data exists — which is why a bug here can hide for months.
//  - Annualising is YTD-run-rate (YTD ÷ n × 12), not "this month × 12". For
//    month 1 the two are identical, which is exactly why an April-only test
//    fixture can't catch this either — the divergence only shows up from
//    month 2 onward.
//
// Creditors: per the source MIS methodology, Sundry Creditors is taken on the
// liability (credit) side via a straight sign flip (−1 × balance) — NOT an
// abs()-forced negative. The reference workbook's own figures are sometimes
// positive (e.g. April), so forcing negative here would silently disagree
// with the client's own MIS.

import type { TemplateLine } from "./catalog";
import { computePnl, groupIndex } from "./pnl";
import type { ManualInputs, MasterRow } from "./types";

export interface CccResult {
  /** This month's own revenue/purchases/COGS — not the YTD figures used internally for annualising. */
  revenue: number;
  purchases: number;
  cogs: number;
  /** This month's own closing balances (creditors sign-flipped — see module doc). */
  closingDebtors: number;
  closingCreditors: number;
  closingInventory: number;
  debtorTurnover: number;
  creditorTurnover: number;
  inventoryTurnover: number;
  /** Debtor Collection Period (days). */
  dcp: number;
  /** Creditor Payment Period (days). */
  cpp: number;
  /** Inventory Conversion Period (days). */
  icp: number;
  /** Cash Conversion Cycle = DCP + ICP − CPP (days). */
  ccc: number;

  // --- "Working Sheet" detail — every intermediate the reference workbook
  // shows in its own right-hand block, exposed so the dashboard can render
  // the same audit trail instead of just the headline ratios. ---
  /** 1-based position of this month within the financial year to date. */
  monthNumber: number;
  openingDebtors: number;
  avgDebtors: number;
  openingCreditors: number;
  avgCreditors: number;
  openingInventory: number;
  avgInventory: number;
  /** Year-to-date sums (this month's flow plus every earlier FY month's). */
  ytdRevenue: number;
  ytdPurchases: number;
  ytdCogs: number;
  /** (YTD ÷ monthNumber) × 12 — the run-rate each turnover ratio divides by. */
  annualisedRevenue: number;
  annualisedPurchases: number;
  annualisedCogs: number;
}

const ANNUALIZE = 12;
const days = (turnover: number) => (turnover ? Math.round(365 / turnover) : 0);

/** One financial year's month, as far as this engine needs it. */
export interface CccMonth {
  master: MasterRow[];
  manual?: ManualInputs;
}

/**
 * `fyMonths` is every FY period up to and including the month being reported
 * on, in chronological order — e.g. for July, pass [April, May, June, July].
 * The engine needs the whole run, not just the current month, because both
 * the average-balance denominator (FY-opening) and the annualised numerator
 * (YTD run-rate) are defined across the full financial year to date.
 *
 * `template` supplies the purchase groupings summed for the Creditor
 * Turnover ratio's numerator — this used to be a private, hardcoded
 * `PURCHASE_GROUPINGS` constant duplicated from catalog.ts's purchase lines
 * (a real bug: the two could silently drift). Callers derive it from the
 * same `template` they already fetch for `computePnl`/`computeBookToBank`:
 * `template.filter(l => l.section === "purchase").map(l => l.grouping)`.
 */
export function computeCcc(fyMonths: CccMonth[], template: TemplateLine[]): CccResult {
  if (fyMonths.length === 0) {
    return {
      revenue: 0,
      purchases: 0,
      cogs: 0,
      closingDebtors: 0,
      closingCreditors: 0,
      closingInventory: 0,
      debtorTurnover: 0,
      creditorTurnover: 0,
      inventoryTurnover: 0,
      dcp: 0,
      cpp: 0,
      icp: 0,
      ccc: 0,
      monthNumber: 0,
      openingDebtors: 0,
      avgDebtors: 0,
      openingCreditors: 0,
      avgCreditors: 0,
      openingInventory: 0,
      avgInventory: 0,
      ytdRevenue: 0,
      ytdPurchases: 0,
      ytdCogs: 0,
      annualisedRevenue: 0,
      annualisedPurchases: 0,
      annualisedCogs: 0,
    };
  }

  const num = (v: number | undefined) => (typeof v === "number" ? v : undefined);
  const n = fyMonths.length;
  const first = fyMonths[0];
  const current = fyMonths[n - 1];
  const currentManual = current.manual ?? {};

  const { sumClosing: curClosing } = groupIndex(current.master);
  const { sumOpening: fyOpen } = groupIndex(first.master);

  const purchaseGroupings = template
    .filter((l) => l.section === "purchase")
    .map((l) => l.grouping)
    .filter((g): g is string => Boolean(g));

  // This month's own monthly figures (also what's exposed on the result).
  const revenue = computePnl(current.master, currentManual, template).totals.revenue;
  const cogs = computePnl(current.master, currentManual, template).totals.cogs;
  const purchases = purchaseGroupings.reduce((a, g) => a + curClosing(g), 0);

  // YTD run-rate: sum each FY month's own monthly figure, then annualise the
  // average — matching the reference's "Running (YTD)" / n × 12 pattern.
  let ytdRevenue = 0;
  let ytdPurchases = 0;
  let ytdCogs = 0;
  for (const m of fyMonths) {
    const manual = m.manual ?? {};
    const t = computePnl(m.master, manual, template).totals;
    ytdRevenue += t.revenue;
    ytdCogs += t.cogs;
    const { sumClosing } = groupIndex(m.master);
    ytdPurchases += purchaseGroupings.reduce((a, g) => a + sumClosing(g), 0);
  }
  const annualise = (ytd: number) => (ytd / n) * ANNUALIZE;
  const annualisedRevenue = annualise(ytdRevenue);
  const annualisedPurchases = annualise(ytdPurchases);
  const annualisedCogs = annualise(ytdCogs);

  const closingDebtors = curClosing("Sundry Debtors");
  const openingDebtors = fyOpen("Sundry Debtors");
  const avgDebtors = (openingDebtors + closingDebtors) / 2;

  const closingCreditors = -curClosing("Sundry Creditors");
  const openingCreditors = -fyOpen("Sundry Creditors");
  const avgCreditors = (openingCreditors + closingCreditors) / 2;

  const closingInventory = num(currentManual.closingStock) ?? 0;
  const openingInventory = fyOpen("Opening Stock");
  const avgInventory = (openingInventory + closingInventory) / 2;

  const debtorTurnover = avgDebtors ? annualisedRevenue / avgDebtors : 0;
  const creditorTurnover = avgCreditors ? annualisedPurchases / avgCreditors : 0;
  const inventoryTurnover = avgInventory ? annualisedCogs / avgInventory : 0;

  const dcp = days(debtorTurnover);
  const cpp = days(creditorTurnover);
  const icp = days(inventoryTurnover);
  // CCC is rounded ONCE, from the exact (unrounded) day-equivalents — not by
  // summing dcp/icp/cpp's own already-rounded display values. Confirmed
  // against the reference workbook: e.g. 26.86 + 34.59 − 51.26 = 10.19 → 10d,
  // whereas summing the rounded displays (27 + 35 − 51) gives 11d instead.
  const exactDays = (turnover: number) => (turnover ? 365 / turnover : 0);
  const ccc = Math.round(
    exactDays(debtorTurnover) + exactDays(inventoryTurnover) - exactDays(creditorTurnover),
  );

  return {
    revenue,
    purchases,
    cogs,
    closingDebtors,
    closingCreditors,
    closingInventory,
    debtorTurnover,
    creditorTurnover,
    inventoryTurnover,
    dcp,
    cpp,
    icp,
    ccc,
    monthNumber: n,
    openingDebtors,
    avgDebtors,
    openingCreditors,
    avgCreditors,
    openingInventory,
    avgInventory,
    ytdRevenue,
    ytdPurchases,
    ytdCogs,
    annualisedRevenue,
    annualisedPurchases,
    annualisedCogs,
  };
}
