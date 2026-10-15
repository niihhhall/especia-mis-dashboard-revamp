import "server-only";

import {
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getReportScope,
  getReportScopeConfig,
  type Period,
} from "@/lib/data/mis";
import { computeCcc, type CccMonth } from "@/lib/mis/ccc";
import type { MasterRowScope } from "@/lib/mis/types";

import type { CccColumn } from "./ccc-rows";

async function fyMonth(periodId: string, scope: MasterRowScope): Promise<CccMonth> {
  const [master, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return { master, manual };
}

/**
 * Everything the Cash conversion page shows for the selected period.
 *
 * The reference workbook's CCC sheet averages every balance against the
 * financial year's OPENING position and annualises off the YTD run-rate, so
 * every month's own figure needs the FY run up to and including it, not just
 * that one month. Each column is computeCcc() over a longer prefix of the
 * same FY array, mirroring how the sheet's own monthly columns each read
 * further back into the year.
 */
export async function loadCccView(companyId: string | undefined, period: Period, scopeOverride: string | undefined) {
  const [fyPeriods, template, reportScope, segments, scopeConfig] = await Promise.all([
    getFyPeriods(period, companyId),
    getMisTemplate(companyId),
    getReportScope(companyId, "ccc", scopeOverride),
    getMisSegments(companyId),
    getReportScopeConfig(companyId),
  ]);
  const fyMonths = await Promise.all(fyPeriods.map((p) => fyMonth(p.id, reportScope.scope)));
  const monthlyResults = fyMonths.map((_, i) => computeCcc(fyMonths.slice(0, i + 1), template));

  const currentIdx = fyPeriods.findIndex((p) => p.id === period.id);
  const c = monthlyResults[currentIdx] ?? monthlyResults[monthlyResults.length - 1];
  const priorIdx = currentIdx - 1;
  const prior = priorIdx >= 0 ? monthlyResults[priorIdx] : null;
  const priorLabel = priorIdx >= 0 ? fyPeriods[priorIdx].label : null;

  const monthColumns: CccColumn[] = fyPeriods.map((fp, i) => ({ key: fp.id, label: fp.label, c: monthlyResults[i] }));
  // Ratios and balances aren't flows, so, matching the reference workbook,
  // the YTD column repeats the latest month rather than summing across them.
  const columns: CccColumn[] = monthColumns.length > 1 ? [...monthColumns, { key: "ytd", label: "YTD", c }] : monthColumns;

  const bars = [
    { name: "Debtor days", value: c.dcp },
    { name: "Inventory days", value: c.icp },
    { name: "Creditor days", value: c.cpp },
    { name: "CCC", value: c.ccc, emphasis: true },
  ];

  return {
    fyPeriods,
    c,
    prior: prior && priorLabel ? { c: prior, label: priorLabel } : null,
    columns,
    bars,
    reportScope,
    segments,
    scopeConfig,
  };
}
