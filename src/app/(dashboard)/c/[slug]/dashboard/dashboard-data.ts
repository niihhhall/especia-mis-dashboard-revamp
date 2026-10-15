import {
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getPriorPeriod,
  getReportScope,
  type Period,
} from "@/lib/data/mis";
import { negParens } from "@/lib/format";
import { kpiDelta } from "@/lib/kpi";
import { computeBookToBank } from "@/lib/mis/book-to-bank";
import { computeCcc, type CccResult } from "@/lib/mis/ccc";
import type { TemplateLine } from "@/lib/mis/catalog";
import { computePnl } from "@/lib/mis/pnl";
import type { MasterRowScope } from "@/lib/mis/types";
import type { KpiItem } from "@/types/kpi";

/**
 * Everything the consolidated view needs for one month. Shares ONE row
 * fetch across P&L/Book-to-Bank/CCC, so `scope` here is the MOST
 * RESTRICTIVE of those three reports' own configured depths (resolved by
 * `getReportScope(companyId, ["pnl","book_to_bank","ccc"])` below), this
 * page can't honor a deeper scope for P&L than Book to Bank's own setting
 * allows while reading both from the same rows.
 */
export async function monthSnapshot(periodId: string, template: TemplateLine[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return {
    master: rows,
    manual,
    pnl: computePnl(rows, manual, template),
    btb: computeBookToBank(rows, manual, template),
  };
}

export type MonthSnapshot = Awaited<ReturnType<typeof monthSnapshot>>;

/** Just the figures the summary needs, so the YTD roll-up can reuse it. */
export interface SummaryTotals {
  revenue: number;
  cogs: number;
  grossProfit: number;
  indirectIncome: number;
  indirectExpense: number;
  ebt: number;
}

/** The condensed six-line profit summary, as a client reads it. */
export function summaryRows(t: SummaryTotals) {
  return [
    { key: "sales", label: "Sales", value: t.revenue, strong: true },
    { key: "cogs", label: "COGS", value: t.cogs },
    { key: "gp", label: "Gross profit", value: t.grossProfit, strong: true },
    { key: "ii", label: "Indirect income", value: t.indirectIncome },
    { key: "fc", label: "Indirect expenses", value: t.indirectExpense },
    { key: "ebt", label: "Net profit (EBT)", value: t.ebt, strong: true },
  ];
}

/** YTD sums the flows across the financial year to date. */
export function ytdTotals(snapshots: MonthSnapshot[]): SummaryTotals {
  return snapshots.reduce(
    (a, s) => ({
      revenue: a.revenue + s.pnl.totals.revenue,
      cogs: a.cogs + s.pnl.totals.cogs,
      grossProfit: a.grossProfit + s.pnl.totals.grossProfit,
      indirectIncome: a.indirectIncome + s.pnl.totals.indirectIncome,
      indirectExpense: a.indirectExpense + s.pnl.totals.indirectExpense,
      ebt: a.ebt + s.pnl.totals.ebt,
    }),
    { revenue: 0, cogs: 0, grossProfit: 0, indirectIncome: 0, indirectExpense: 0, ebt: 0 },
  );
}

/**
 * Balances, not flows, the export's own Summary sheet never sums these
 * across months either, so YTD here repeats the latest month rather than
 * adding balances together (which would be meaningless for a point-in-time
 * figure like a closing debtor balance).
 */
export function balanceColumns(args: {
  fyPeriods: { id: string; label: string }[];
  snapshots: MonthSnapshot[];
  cccByMonth: CccResult[];
  ccc: CccResult;
  current: MonthSnapshot;
  ytdLabel: string;
}) {
  const { fyPeriods, snapshots, cccByMonth, ccc, current, ytdLabel } = args;
  const fyStartLabel = fyPeriods[0]?.label.slice(0, 3) ?? "Apr";
  const openingColumn = {
    key: "opening",
    label: `${fyStartLabel} opening`,
    // Every month's CCC result carries the SAME FY-opening figures (they're
    // always read off the FY's first month), so any one of them will do.
    debtors: ccc.openingDebtors,
    creditors: ccc.openingCreditors,
    inventory: ccc.openingInventory,
    // Cash has no such field on CccResult, April's own openingCash IS the
    // FY-opening figure, by definition, since it's the FY's first month.
    cash: snapshots[0]?.btb.openingCash ?? 0,
    cccDays: null as number | null, // CCC is a computed metric, not a balance: no "opening" value.
  };
  return [
    openingColumn,
    ...fyPeriods.map((p, i) => ({
      key: p.id,
      label: p.label,
      debtors: cccByMonth[i].closingDebtors,
      creditors: cccByMonth[i].closingCreditors,
      inventory: cccByMonth[i].closingInventory,
      cash: snapshots[i].btb.closingCash,
      cccDays: cccByMonth[i].ccc as number | null,
    })),
    {
      key: "ytd",
      label: ytdLabel,
      debtors: ccc.closingDebtors,
      creditors: ccc.closingCreditors,
      inventory: ccc.closingInventory,
      cash: current.btb.closingCash,
      cccDays: ccc.ccc as number | null,
    },
  ];
}

export type BalanceColumn = ReturnType<typeof balanceColumns>[number];

export const balanceRows: { key: string; label: string; get: (c: BalanceColumn) => number | null; days?: boolean }[] = [
  { key: "debtors", label: "Sundry debtors", get: (c) => c.debtors },
  { key: "creditors", label: "Sundry creditors", get: (c) => c.creditors },
  { key: "inventory", label: "Inventory", get: (c) => c.inventory },
  { key: "cash", label: "Cash, bank & OD", get: (c) => c.cash },
  { key: "cccDays", label: "CCC (days)", get: (c) => c.cccDays, days: true },
];

/**
 * Everything the dashboard's cards need for the selected period: the month
 * snapshots for the financial year, the CCC run, the summary columns and the
 * KPI cells. Fetches and computes only; the page composes the result.
 */
export async function loadDashboardView(args: {
  companyId: string | undefined;
  period: Period;
  fmt: (v: number) => string;
}) {
  const { companyId, period, fmt } = args;
  const [fyPeriods, prior, template, reportScope, segments] = await Promise.all([
    getFyPeriods(period, companyId),
    getPriorPeriod(period, companyId),
    getMisTemplate(companyId),
    getReportScope(companyId, ["pnl", "book_to_bank", "ccc"]),
    getMisSegments(companyId),
  ]);
  const { scope } = reportScope;
  const snapshots = await Promise.all(fyPeriods.map((p) => monthSnapshot(p.id, template, scope)));

  const idx = fyPeriods.findIndex((p) => p.id === period.id);
  const current = snapshots[idx] ?? snapshots[snapshots.length - 1];
  // Prior month may sit in the previous FY (April's comparison is March), so it
  // is fetched separately rather than taken from the FY slice.
  const priorSnap = prior ? await monthSnapshot(prior.id, template, scope) : null;

  // CCC needs the whole FY run, not a single month: every balance is averaged
  // against the FY's OPENING position and turnover is annualised off the YTD
  // run-rate. Each month's own CCC is this same FY array read up to that month.
  const cccByMonth = snapshots.map((_, i) =>
    computeCcc(
      snapshots.slice(0, i + 1).map((s) => ({ master: s.master, manual: s.manual })),
      template,
    ),
  );
  const ccc = cccByMonth[idx] ?? cccByMonth[cccByMonth.length - 1];
  // "Prior" for CCC is this same FY run one month shorter, not the cross-FY
  // `priorSnap` (there is no coherent "FY-to-date" for a month in the previous FY).
  const priorCcc = idx > 0 ? cccByMonth[idx - 1] : null;

  const ytdLabel = `YTD (${fyPeriods[0]?.label.slice(0, 3)}-${period.label.slice(0, 3)})`;
  const summaryColumns = [
    ...fyPeriods.map((p, i) => ({ key: p.id, label: p.label, rows: summaryRows(snapshots[i].pnl.totals) })),
    { key: "ytd", label: ytdLabel, rows: summaryRows(ytdTotals(snapshots)) },
  ];
  return {
    reportScope,
    segments,
    months: fyPeriods.length,
    summaryColumns,
    balanceCols: balanceColumns({ fyPeriods, snapshots, cccByMonth, ccc, current, ytdLabel }),
    kpis: dashboardKpis({ fmt, periodLabel: period.label, current, prior: priorSnap, ccc, priorCcc }),
  };
}

/**
 * One KPI cell's figures. A null or non-finite value is the "No data" state;
 * money goes through the page's unit formatter, days show as "12d".
 */
function kpi(
  fmt: (v: number) => string,
  key: string,
  label: string,
  value: number | null,
  prior: number | undefined,
  opts: { format?: "money" | "days"; goodWhenUp?: boolean } = {},
): KpiItem {
  if (value === null || !Number.isFinite(value)) return { key, label, value: null, delta: null };
  const shown = opts.format === "days" ? `${Math.round(value)}d` : negParens(fmt(value));
  return { key, label, value: shown, delta: kpiDelta(value, prior, opts.goodWhenUp ?? true) };
}

/** The dashboard's ten KPIs, in the order the dashboard has always shown them. */
export function dashboardKpis(args: {
  fmt: (v: number) => string;
  periodLabel: string;
  current: MonthSnapshot;
  prior: MonthSnapshot | null;
  ccc: CccResult;
  priorCcc: CccResult | null;
}): KpiItem[] {
  const { fmt, periodLabel, current, prior, ccc, priorCcc } = args;
  const t = current.pnl.totals;
  const pt = prior?.pnl.totals;
  return [
    kpi(fmt, "revenue", `Revenue · ${periodLabel}`, t.revenue, pt?.revenue),
    kpi(fmt, "gp", "Gross profit", t.grossProfit, pt?.grossProfit),
    kpi(fmt, "ebt", "Net profit (EBT)", t.ebt, pt?.ebt),
    kpi(fmt, "debtors", "Sundry debtors", ccc.closingDebtors, priorCcc?.closingDebtors, { goodWhenUp: false }),
    kpi(fmt, "creditors", "Sundry creditors", ccc.closingCreditors, priorCcc?.closingCreditors),
    kpi(fmt, "inventory", "Inventory", ccc.closingInventory, priorCcc?.closingInventory, { goodWhenUp: false }),
    kpi(fmt, "ccc", "Cash conversion cycle", ccc.ccc, priorCcc?.ccc, { format: "days", goodWhenUp: false }),
    kpi(fmt, "loan", "Loan / liability", current.btb.loanChange, prior?.btb.loanChange),
    kpi(fmt, "capital", "Change in capital", current.btb.capitalChange, prior?.btb.capitalChange),
    kpi(fmt, "fixed", "Fixed assets", current.btb.fixedAssetChange, prior?.btb.fixedAssetChange),
  ];
}
