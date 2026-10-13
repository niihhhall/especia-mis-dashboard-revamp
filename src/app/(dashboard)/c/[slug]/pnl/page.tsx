import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { visibleReportTabs, withChannelTabs } from "@/lib/report-tabs";

import { BranchScopeSelector } from "@/components/branch-scope-selector";
import { KpiTile } from "@/components/kpi";
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
  getSelectedPeriod,
} from "@/lib/data/mis";
import { fmtPct, fyDisplay } from "@/lib/format";
import { getFmtCompact } from "@/lib/data/unit";
import type { TemplateLine } from "@/lib/mis/catalog";
import { computePnl } from "@/lib/mis/pnl";
import { fyLabel } from "@/lib/mis/period";
import { QuarterFilter } from "@/components/quarter-filter";
import { parseQuarters, planColumns, quarterLabel, quartersParam, quartersWithData, type Quarter } from "@/lib/mis/quarters";
import { buildYtd } from "@/lib/mis/ytd";
import type { ManualInputs, MasterRowScope } from "@/lib/mis/types";

import { PnlTable, type PnlColumn } from "./pnl-table";
import { scopedLink } from "@/lib/data/scoped-link";
import { activeCompanyId } from "@/lib/data/company-context";

export const metadata = { title: "P&L Detail" };

async function pnlForPeriod(periodId: string, template: TemplateLine[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return { pnl: computePnl(rows, manual, template), manual };
}

export default async function PnlPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scope?: string; view?: string; q?: string }>;
}) {
  const fmtCompact = await getFmtCompact();
  const { slug } = await params;
  const { scope: scopeOverride, view, q: qParam } = await searchParams;
  const selectedQuarters = parseQuarters(qParam);
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const current = await getSelectedPeriod(companyId ?? undefined);

  if (!current) {
    return (
      <section>
        <PageHeader title="P&L Detail" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No data yet.{" "}
          <Link href={scoped("/upload")} className="font-medium text-primary underline">
            Upload a Trial Balance
          </Link>{" "}
          to build the Profit Statement.
        </div>
      </section>
    );
  }

  const [company, fyPeriods, template, reportScope, segments, scopeConfig] = await Promise.all([
    getCompany(companyId ?? undefined),
    getFyPeriods(current, companyId ?? undefined),
    getMisTemplate(companyId ?? undefined),
    getReportScope(companyId ?? undefined, "pnl", scopeOverride),
    getMisSegments(companyId ?? undefined),
    getReportScopeConfig(companyId ?? undefined),
  ]);
  const { scope } = reportScope;
  const fyStartNo = company?.fy_start_month ?? 4;

  // "Branch-wise" — one column per branch instead of one per month, so the
  // branches inside the active scope can be compared side by side for the
  // selected period. Only offered when the active scope is Consolidated (all
  // branches) or a Channel Group (that group's own branches) AND there's
  // more than one branch to compare — an individual-branch scope has
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
    // The scope's own total (also today's KPI-tile figure — reused as the
    // trailing "Total" column, no second fetch) plus every branch's rows,
    // fetched ONCE and sliced per branch in memory — instead of two queries
    // per branch.
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
    // closes at the last — the same roll-up the YTD column uses); every other month stays its own column.
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

    // A single month is already its own YTD — no point repeating the column.
    columns =
      monthColumns.length > 1
        ? [
            ...monthColumns,
            { key: "ytd", label: "YTD", lines: buildYtd(results.map((r) => r.pnl.lines)) },
          ]
        : monthColumns;

    const currentIdx = fyPeriods.findIndex((p) => p.id === current.id);
    currentResult = results[currentIdx] ?? results[results.length - 1];
    fyMonthsShown = fyPeriods.length;
  }

  const t = currentResult.pnl.totals;
  const manual = currentResult.manual;
  const margin = (v: number) => (t.revenue ? fmtPct(v / t.revenue) : "—");
  const inputsEmpty = Object.keys(manual as ManualInputs).length === 0;

  // Both toggle links carry the RESOLVED scope explicitly (not the raw
  // `?scope=` param, which may be absent when the scope came from the
  // cookie) so either link is correct and bookmarkable regardless of how
  // the current scope was actually chosen.
  const scopeQuery = reportScope.current !== "consolidated" ? `scope=${reportScope.current}` : "";
  const monthlyHref = scoped(`/pnl${scopeQuery ? `?${scopeQuery}` : ""}`);
  // The quarter buttons keep the resolved scope on the URL and add / drop `q` — nothing else changes.
  const quarterHref = (qs: Quarter[]) => {
    const query = [scopeQuery, qs.length ? `q=${quartersParam(qs)}` : ""].filter(Boolean).join("&");
    return scoped(`/pnl${query ? `?${query}` : ""}`);
  };
  const branchWiseHref = scoped(`/pnl?${[scopeQuery, "view=branches"].filter(Boolean).join("&")}`);

  return (
    <section className="space-y-6">
      <PageHeader
        title="P&L Detail"
        subtitle={
          <>
            Profit Statement — {current.label} · {fyDisplay(fyLabel(current.month, company?.fy_start_month ?? 4))}
            {branchWiseActive ? (
              <span> · Branch-wise ({branchWiseBranches.length} branches)</span>
            ) : (
              fyMonthsShown > 1 && <span> · {fyMonthsShown} months to date</span>
            )}
          </>
        }
        filters={
          <>
          <PeriodSelector />
          {!branchWiseActive && fyPeriods.length > 1 && (
            <QuarterFilter
              selected={selectedQuarters}
              available={quartersWithData(fyPeriods, (p) => p.month, fyStartNo)}
              fyStartMonthNo={fyStartNo}
              buildHref={quarterHref}
            />
          )}
          {canBranchWise && (
            <div className="flex items-center gap-1 rounded-[11px] border border-border bg-card p-1">
              <Link
                href={monthlyHref}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  branchWiseActive
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "brand-grad text-white shadow-sm"
                }`}
              >
                Monthly
              </Link>
              <Link
                href={branchWiseHref}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  branchWiseActive
                    ? "brand-grad text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Branch-wise
              </Link>
            </div>
          )}
          <BranchScopeSelector
            branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
            groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
            depth={reportScope.depth}
            current={reportScope.current}
          />
          </>
        }
      />

      <ReportTabs tabs={withChannelTabs(visibleReportTabs(segments.length > 0), reportScope.branchGroups, scopeConfig)} />

      {inputsEmpty && (
        <div className="rounded-lg border border-primary/20 bg-primary/12 p-3 text-sm text-primary">
          No adjustments entered for {current.label}. Closing stock, depreciation and interest are
          treated as zero —{" "}
          <Link href={scoped("/inputs")} className="font-medium underline">
            enter Adjustments
          </Link>{" "}
          for an accurate statement.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Revenue" value={fmtCompact(t.revenue)} />
        <KpiTile
          label="Gross Profit"
          value={fmtCompact(t.grossProfit)}
          sub={`${margin(t.grossProfit)} margin`}
          tone={t.grossProfit >= 0 ? "pos" : "neg"}
        />
        <KpiTile label="EBITDA" value={fmtCompact(t.ebitda)} sub={`${margin(t.ebitda)} margin`} />
        <KpiTile
          label="Net Profit (EBT)"
          value={fmtCompact(t.ebt)}
          sub={`${margin(t.ebt)} margin`}
          tone={t.ebt >= 0 ? "pos" : "neg"}
        />
      </div>

      <PnlTable columns={columns} />
    </section>
  );
}
