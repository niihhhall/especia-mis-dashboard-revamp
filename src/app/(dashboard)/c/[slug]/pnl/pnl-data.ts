import "server-only";

import {
  getBranchSlices,
  getCompany,
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getReportScope,
  getReportScopeConfig,
  type Period,
} from "@/lib/data/mis";
import type { TemplateLine } from "@/lib/mis/catalog";
import { computePnl } from "@/lib/mis/pnl";
import { planColumns, quarterLabel, type Quarter } from "@/lib/mis/quarters";
import { buildYtd } from "@/lib/mis/ytd";
import type { MasterRowScope } from "@/lib/mis/types";

import type { PnlColumn } from "./pnl-rows";

async function pnlForPeriod(periodId: string, template: TemplateLine[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return { pnl: computePnl(rows, manual, template), manual };
}

/** Everything the P&L Detail page shows for the selected period, scope, view and quarters. */
export async function loadPnlView(
  companyId: string | undefined,
  current: Period,
  scopeOverride: string | undefined,
  view: string | undefined,
  selectedQuarters: Quarter[],
) {
  const [company, fyPeriods, template, reportScope, segments, scopeConfig] = await Promise.all([
    getCompany(companyId),
    getFyPeriods(current, companyId),
    getMisTemplate(companyId),
    getReportScope(companyId, "pnl", scopeOverride),
    getMisSegments(companyId),
    getReportScopeConfig(companyId),
  ]);
  const { scope } = reportScope;
  const fyStartNo = company?.fy_start_month ?? 4;

  // "Branch-wise" is one column per branch instead of one per month, so the
  // branches inside the active scope can be compared side by side for the
  // selected period. Only offered when the active scope is Consolidated (all
  // branches) or a Channel Group (that group's own branches) AND there's
  // more than one branch to compare. An individual-branch scope has
  // nothing to break down further, same gating BranchScopeSelector already
  // applies to its own "Branches" optgroup.
  const activeGroupId = reportScope.current.startsWith("group:") ? reportScope.current.slice(6) : null;
  const branchWiseBranches =
    activeGroupId !== null
      ? reportScope.branches.filter((b) => !b.archivedAt && b.groupId === activeGroupId)
      : reportScope.current === "consolidated"
        ? reportScope.branches.filter((b) => !b.archivedAt)
        : [];
  const canBranchWise = branchWiseBranches.length > 1;
  const branchWiseActive = view === "branches" && canBranchWise;

  let columns: PnlColumn[];
  let currentResult: Awaited<ReturnType<typeof pnlForPeriod>>;
  let fyMonthsShown = 0;

  if (branchWiseActive) {
    // The scope's own total (also the KPI figure, reused as the trailing
    // "Total" column, no second fetch) plus every branch's rows, fetched ONCE
    // and sliced per branch in memory, instead of two queries per branch.
    const branchIds = branchWiseBranches.map((b) => b.id);
    const [totalResult, slices] = await Promise.all([
      pnlForPeriod(current.id, template, scope),
      getBranchSlices(current.id, branchIds),
    ]);
    const branchResults = branchWiseBranches.map((b) => ({
      pnl: computePnl(slices.rowsFor([b.id]), slices.manualFor([b.id]), template),
    }));
    currentResult = totalResult;
    const branchColumns: PnlColumn[] = branchWiseBranches.map((b, i) => ({
      key: b.id,
      label: b.label,
      lines: branchResults[i].pnl.lines,
    }));
    const totalLabel =
      activeGroupId !== null
        ? `${reportScope.branchGroups.find((g) => g.id === activeGroupId)?.label ?? "Group"} Total`
        : "Consolidated";
    columns = [...branchColumns, { key: "total", label: totalLabel, lines: currentResult.pnl.lines }];
  } else {
    const results = await Promise.all(fyPeriods.map((p) => pnlForPeriod(p.id, template, scope)));

    // A picked quarter folds its months into one column (flows add, stock opens at the first month and
    // closes at the last, the same roll-up the YTD column uses); every other month stays its own column.
    const monthColumns: PnlColumn[] = planColumns(
      fyPeriods.map((p, i) => ({ p, r: results[i] })),
      (x) => x.p.month,
      selectedQuarters,
      fyStartNo,
    ).map((entry) =>
      entry.kind === "month"
        ? { key: entry.item.p.id, label: entry.item.p.label, lines: entry.item.r.pnl.lines }
        : {
            key: `q${entry.quarter}`,
            label: quarterLabel(entry.quarter, entry.items.length),
            lines: buildYtd(entry.items.map((x) => x.r.pnl.lines)),
          },
    );

    // A single month is already its own YTD, so the column is not repeated.
    columns =
      monthColumns.length > 1
        ? [...monthColumns, { key: "ytd", label: "YTD", lines: buildYtd(results.map((r) => r.pnl.lines)) }]
        : monthColumns;

    const currentIdx = fyPeriods.findIndex((p) => p.id === current.id);
    currentResult = results[currentIdx] ?? results[results.length - 1];
    fyMonthsShown = fyPeriods.length;
  }

  return {
    company,
    fyPeriods,
    fyStartNo,
    reportScope,
    segments,
    scopeConfig,
    columns,
    totals: currentResult.pnl.totals,
    manual: currentResult.manual,
    branchWiseBranches,
    canBranchWise,
    branchWiseActive,
    fyMonthsShown,
  };
}
