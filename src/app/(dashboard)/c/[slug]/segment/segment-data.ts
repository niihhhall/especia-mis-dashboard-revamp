import "server-only";

import {
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getPriorPeriod,
  getReportScope,
  getReportScopeConfig,
  type Period,
} from "@/lib/data/mis";
import type { SegmentDef } from "@/lib/mis/catalog";
import { computeSegment, type SegmentRow } from "@/lib/mis/segment";
import type { MasterRowScope } from "@/lib/mis/types";

async function segmentFor(periodId: string, segments: SegmentDef[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return { result: computeSegment(rows, manual, segments), manual };
}

/** Everything the Segment P&L page shows for the selected period, with the prior month alongside. */
export async function loadSegmentView(companyId: string | undefined, period: Period, scopeOverride: string | undefined) {
  const [prior, segmentDefs, reportScope, scopeConfig] = await Promise.all([
    getPriorPeriod(period, companyId),
    getMisSegments(companyId),
    getReportScope(companyId, "segment", scopeOverride),
    getReportScopeConfig(companyId),
  ]);
  if (segmentDefs.length === 0) return { kind: "none" as const, reportScope, scopeConfig };

  const { result, manual } = await segmentFor(period.id, segmentDefs, reportScope.scope);
  const priorData = prior ? await segmentFor(prior.id, segmentDefs, reportScope.scope) : null;

  // Segment rows are keyed by name, so the prior month lines up row-for-row.
  const priorByName: Record<string, SegmentRow> | undefined = priorData
    ? Object.fromEntries([...priorData.result.segments, priorData.result.total].map((s) => [s.name, s]))
    : undefined;

  return {
    kind: "segments" as const,
    reportScope,
    scopeConfig,
    segmentDefs,
    segments: result.segments,
    total: result.total,
    prior: prior && priorData ? prior : null,
    priorByName,
    noStock: !manual.segmentOpeningStock && !manual.segmentClosingStock,
    chartData: result.segments.map((s) => ({ name: s.name, revenue: s.revenue, grossProfit: s.grossProfit, mix: s.mix })),
  };
}
