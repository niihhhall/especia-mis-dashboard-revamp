import "server-only";

import { getBranchGroups, getReportScopeConfig } from "@/lib/data/mis";
import { visibleReportTabs, withChannelTabs } from "@/lib/report-tabs";
import type { ReportTab } from "@/types/report";

/**
 * The report tab bar for one company, with channel-group tabs ("B2C P&L",
 * "B2B P&L") already split out. Every report page renders its tab bar from
 * this, so the split is identical everywhere, a CA never has to open P&L
 * Detail first for the channel tabs to appear on the bar.
 */
export async function getReportTabs(companyId: string | undefined, hasSegments: boolean): Promise<ReportTab[]> {
  const [groups, scopeConfig] = await Promise.all([getBranchGroups(companyId), getReportScopeConfig(companyId)]);
  return withChannelTabs(visibleReportTabs(hasSegments), groups, scopeConfig);
}
