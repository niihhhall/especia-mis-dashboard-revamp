import "server-only";

import {
  getBranchSlices,
  getBudget,
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisTemplate,
  type Period,
} from "@/lib/data/mis";
import { computeBookToBank } from "@/lib/mis/book-to-bank";
import { computeBudgetPnl } from "@/lib/mis/budget";
import { computeCcc } from "@/lib/mis/ccc";
import { expenseItems, varianceRows, type ExpenseItem, type VarianceRow } from "@/lib/mis/charts";
import { computePnl } from "@/lib/mis/pnl";
import type { MasterRowScope, PnlResult } from "@/lib/mis/types";

export interface MonthPoint {
  id: string;
  label: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  indirectIncome: number;
  indirectExpense: number;
  ebitda: number;
  ebit: number;
  ebt: number;
  /** null when no budget was entered for this month. */
  budget: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    indirectExpense: number;
    ebitda: number;
    ebt: number;
  } | null;
  debtors: number;
  creditors: number;
  inventory: number;
  cash: number;
  dcp: number;
  icp: number;
  cpp: number;
  ccc: number;
}

export interface CompareRow {
  id: string;
  name: string;
  revenue: number;
  grossProfit: number;
  ebitda: number;
  ebt: number;
}

export interface ChartsData {
  months: MonthPoint[];
  currentId: string;
  expensesByMonth: Record<string, ExpenseItem[]>;
  /** One row per channel group — only on the company-wide view. */
  channels: CompareRow[];
  /** One row per branch in the active scope, for the selected month. */
  branches: CompareRow[];
  /** Selected month's P&L lines, Budget next to Actual. */
  variances: VarianceRow[];
  hasBudget: boolean;
}

export async function getChartsData(
  companyId: string,
  period: Period,
  scope: MasterRowScope,
  branches: { id: string; label: string; groupId: string | null; archivedAt: string | null }[],
  groups: { id: string; label: string }[],
): Promise<ChartsData> {
  const [fyPeriods, template] = await Promise.all([getFyPeriods(period, companyId), getMisTemplate(companyId)]);

  const snaps = await Promise.all(
    fyPeriods.map(async (p) => {
      const [master, manual, budgetByKey] = await Promise.all([
        getMasterRows(p.id, scope),
        getManualInputs(p.id, scope),
        getBudget(p.id),
      ]);
      return { p, master, manual, budgetByKey };
    }),
  );

  const months: MonthPoint[] = [];
  const expensesByMonth: Record<string, ExpenseItem[]> = {};
  let variances: VarianceRow[] = [];
  let hasBudget = false;

  snaps.forEach((s, i) => {
    const pnl = computePnl(s.master, s.manual, template);
    const btb = computeBookToBank(s.master, s.manual, template);
    const ccc = computeCcc(
      snaps.slice(0, i + 1).map((x) => ({ master: x.master, manual: x.manual })),
      template,
    );
    const monthHasBudget = Object.keys(s.budgetByKey).length > 0;
    const budgetPnl = monthHasBudget ? computeBudgetPnl(s.budgetByKey, template) : null;
    if (monthHasBudget) hasBudget = true;
    const t = pnl.totals;
    months.push({
      id: s.p.id,
      label: s.p.label,
      revenue: t.revenue,
      cogs: t.cogs,
      grossProfit: t.grossProfit,
      indirectIncome: t.indirectIncome,
      indirectExpense: t.indirectExpense,
      ebitda: t.ebitda,
      ebit: t.ebit,
      ebt: t.ebt,
      budget: budgetPnl
        ? {
            revenue: budgetPnl.totals.revenue,
            cogs: budgetPnl.totals.cogs,
            grossProfit: budgetPnl.totals.grossProfit,
            indirectExpense: budgetPnl.totals.indirectExpense,
            ebitda: budgetPnl.totals.ebitda,
            ebt: budgetPnl.totals.ebt,
          }
        : null,
      debtors: ccc.closingDebtors,
      creditors: ccc.closingCreditors,
      inventory: ccc.closingInventory,
      cash: btb.closingCash,
      dcp: ccc.dcp,
      icp: ccc.icp,
      cpp: ccc.cpp,
      ccc: ccc.ccc,
    });
    expensesByMonth[s.p.id] = expenseItems(template, pnl.lines);
    if (s.p.id === period.id) {
      variances = varianceRows(template, pnl.lines, budgetPnl?.lines ?? []);
    }
  });

  // Channel / branch comparison for the selected month. Channels only make
  // sense company-wide; branches follow whichever channel is open.
  const live = branches.filter((b) => !b.archivedAt);
  const inScope =
    scope.kind === "group"
      ? live.filter((b) => scope.branchIds.includes(b.id))
      : scope.kind === "branch"
        ? live.filter((b) => b.id === scope.branchId)
        : live;

  const row = (id: string, name: string, t: PnlResult["totals"]): CompareRow => ({
    id,
    name,
    revenue: t.revenue,
    grossProfit: t.grossProfit,
    ebitda: t.ebitda,
    ebt: t.ebt,
  });

  // One fetch of every branch involved (the channels' branches and the branches being compared), sliced in
  // memory — instead of two queries per branch and per channel.
  const channelDefs = scope.kind === "consolidated" ? groups : [];
  const channelBranchIds = (g: { id: string }) => live.filter((b) => b.groupId === g.id).map((b) => b.id);
  const comparedBranches = inScope.length > 1 ? inScope : [];
  const needed = [...new Set([...channelDefs.flatMap(channelBranchIds), ...comparedBranches.map((b) => b.id)])];
  const slices = await getBranchSlices(period.id, needed);
  const totalsOf = (ids: string[]) => computePnl(slices.rowsFor(ids), slices.manualFor(ids), template).totals;

  return {
    months,
    currentId: period.id,
    expensesByMonth,
    channels: channelDefs.map((g) => row(g.id, g.label, totalsOf(channelBranchIds(g)))),
    branches: comparedBranches.map((b) => row(b.id, b.label, totalsOf([b.id]))),
    variances,
    hasBudget,
  };
}
