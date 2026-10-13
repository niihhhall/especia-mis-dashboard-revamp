import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { visibleReportTabs, withChannelTabs } from "@/lib/report-tabs";

import { BranchScopeSelector } from "@/components/branch-scope-selector";
import { ChartCard } from "@/components/chart-card";
import {
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getPriorPeriod,
  getReportScope,
  getReportScopeConfig,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { getFmtAmount } from "@/lib/data/unit";
import { fmtPct } from "@/lib/format";
import type { SegmentDef } from "@/lib/mis/catalog";
import { computeSegment, type SegmentRow } from "@/lib/mis/segment";
import type { MasterRowScope } from "@/lib/mis/types";

import { SegmentGpBar, SegmentRevenuePie } from "./segment-charts";
import { scopedLink } from "@/lib/data/scoped-link";
import { activeCompanyId } from "@/lib/data/company-context";

export const metadata = { title: "Segment P&L" };

/** Prior-period cell — muted, so the comparison column reads as context. */
function PriorAmt({ value, fmt }: { value?: number; fmt: (v: number) => string }) {
  return (
    <td className="nums text-muted-foreground">{value !== undefined ? fmt(value) : "—"}</td>
  );
}

async function segmentFor(periodId: string, segments: SegmentDef[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return { result: computeSegment(rows, manual, segments), manual };
}

export default async function SegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const fmtAmount = await getFmtAmount();
  const { slug } = await params;
  const { scope: scopeOverride } = await searchParams;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const period = await getSelectedPeriod(companyId ?? undefined);
  if (!period) {
    return (
      <section>
        <PageHeader title="Segment P&L" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No data yet.{" "}
          <Link href={scoped("/upload")} className="font-medium text-primary underline">
            Upload a Trial Balance
          </Link>
          .
        </div>
      </section>
    );
  }

  const [prior, segmentDefs, reportScope, scopeConfig] = await Promise.all([
    getPriorPeriod(period, companyId ?? undefined),
    getMisSegments(companyId ?? undefined),
    getReportScope(companyId ?? undefined, "segment", scopeOverride),
    getReportScopeConfig(companyId ?? undefined),
  ]);
  const { scope } = reportScope;

  if (segmentDefs.length === 0) {
    return (
      <section className="space-y-4">
        <PageHeader title="Segment P&L" filters={<PeriodSelector />} />
        <ReportTabs tabs={withChannelTabs(visibleReportTabs(false), reportScope.branchGroups, scopeConfig)} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No segments configured for this company. Segment P&amp;L is optional — add segments under
          the company&rsquo;s MIS template if a revenue split by business line is useful here.
        </div>
      </section>
    );
  }

  const { result, manual } = await segmentFor(period.id, segmentDefs, scope);
  const { segments, total } = result;
  const priorData = prior ? await segmentFor(prior.id, segmentDefs, scope) : null;
  const showPrior = Boolean(prior && priorData);

  // Segment rows are keyed by name, so the prior month lines up row-for-row.
  const priorByName: Record<string, SegmentRow> | undefined = priorData
    ? Object.fromEntries(
        [...priorData.result.segments, priorData.result.total].map((s) => [s.name, s]),
      )
    : undefined;

  const chartData = segments.map((s) => ({
    name: s.name,
    revenue: s.revenue,
    grossProfit: s.grossProfit,
    mix: s.mix,
  }));
  const noStock = !manual.segmentOpeningStock && !manual.segmentClosingStock;
  const rows = [...segments, total];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Segment P&L"
        subtitle={
          <>
            Segment-wise profitability — {period.label}
            {showPrior && <span> vs {prior!.label}</span>}
          </>
        }
        filters={<PeriodSelector />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs
          tabs={withChannelTabs(visibleReportTabs(segmentDefs.length > 0), reportScope.branchGroups, scopeConfig)}
        />
        <BranchScopeSelector
          branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
          groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
          depth={reportScope.depth}
          current={reportScope.current}
        />
      </div>

      {noStock && (
        <div className="rounded-lg border border-primary/20 bg-primary/12 p-3 text-sm text-primary">
          No segment stock entered — gross profit excludes stock movement.{" "}
          <Link href={scoped("/inputs")} className="font-medium underline">
            Add segment stock
          </Link>{" "}
          in Adjustments.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue share by segment"
          empty={chartData.every((d) => d.revenue <= 0) ? "No segment revenue for this month." : undefined}
        >
          <SegmentRevenuePie data={chartData} />
        </ChartCard>
        <ChartCard
          title="Gross profit by segment"
          empty={chartData.length === 0 ? "No segments to plot for this month." : undefined}
        >
          <SegmentGpBar data={chartData} />
        </ChartCard>
      </div>

      <div tabIndex={0} role="region" aria-label="Segment P&L" className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className={`tbl-report tbl-frozen ${showPrior ? "min-w-[1000px]" : "min-w-[720px]"}`}>
          <thead>
            <tr>
              <th rowSpan={showPrior ? 2 : 1}>Segment</th>
              <th colSpan={showPrior ? 2 : 1}>Revenue</th>
              <th colSpan={showPrior ? 2 : 1}>COGS</th>
              <th colSpan={showPrior ? 2 : 1}>Gross Profit</th>
              <th rowSpan={showPrior ? 2 : 1}>Mix</th>
              <th rowSpan={showPrior ? 2 : 1}>GP %</th>
            </tr>
            {showPrior && (
              <tr>
                <th>{prior!.label}</th>
                <th>{period.label}</th>
                <th>{prior!.label}</th>
                <th>{period.label}</th>
                <th>{prior!.label}</th>
                <th>{period.label}</th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((s: SegmentRow) => {
              const isTotal = s.name === total.name;
              const pr = priorByName?.[s.name];
              return (
                <tr key={s.name} className={isTotal ? "row-tot" : ""}>
                  <td>{s.name}</td>
                  {showPrior && <PriorAmt value={pr?.revenue} fmt={fmtAmount} />}
                  <td className="nums">{fmtAmount(s.revenue)}</td>
                  {showPrior && <PriorAmt value={pr?.cogs} fmt={fmtAmount} />}
                  <td className="nums">{fmtAmount(s.cogs)}</td>
                  {showPrior && <PriorAmt value={pr?.grossProfit} fmt={fmtAmount} />}
                  <td className={`nums${!isTotal && s.grossProfit < 0 ? " neg" : ""}`}>
                    {fmtAmount(s.grossProfit)}
                  </td>
                  <td className="nums">{fmtPct(s.mix)}</td>
                  <td className={`nums${!isTotal && s.gpPct < 0 ? " neg" : ""}`}>
                    {fmtPct(s.gpPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
