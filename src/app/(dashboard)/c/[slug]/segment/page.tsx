import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { BranchScopeSelector } from "@/components/shared/branch-scope-selector";
import { EmptyState } from "@/components/shared/empty-state";
import { Notice } from "@/components/shared/notice";
import { activeCompanyId } from "@/lib/data/company-context";
import { getSelectedPeriod } from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtAmount } from "@/lib/data/unit";
import { visibleReportTabs, withChannelTabs } from "@/lib/report-tabs";

import { SegmentChartCards } from "./segment-chart-cards";
import { loadSegmentView } from "./segment-data";
import { SegmentTableCard } from "./segment-table-card";

export const metadata = { title: "Segment P&L" };

const linkClass = "font-medium text-text-primary underline underline-offset-2";

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
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const period = await getSelectedPeriod(companyId);
  if (!period) {
    return (
      <section>
        <PageHeader title="Segment P&L" filters={<PeriodSelector />} />
        <EmptyState
          title="No data yet."
          description={
            <>
              <Link href={scoped("/upload")} className={linkClass}>
                Upload a trial balance
              </Link>
              .
            </>
          }
        />
      </section>
    );
  }

  const view = await loadSegmentView(companyId, period, scopeOverride);
  const { reportScope, scopeConfig } = view;

  if (view.kind === "none") {
    return (
      <section className="space-y-6">
        <PageHeader title="Segment P&L" filters={<PeriodSelector />} />
        <ReportTabs tabs={withChannelTabs(visibleReportTabs(false), reportScope.branchGroups, scopeConfig)} />
        <EmptyState
          title="No segments configured for this company."
          description={
            <>
              Segment P&amp;L is optional: add segments under the company&rsquo;s MIS template if a revenue split by
              business line is useful here.
            </>
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Segment P&L"
        subtitle={
          <>
            Segment-wise profitability: {period.label}
            {view.prior && <span> vs {view.prior.label}</span>}
          </>
        }
        filters={<PeriodSelector />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs tabs={withChannelTabs(visibleReportTabs(view.segmentDefs.length > 0), reportScope.branchGroups, scopeConfig)} />
        <BranchScopeSelector
          branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
          groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
          depth={reportScope.depth}
          current={reportScope.current}
        />
      </div>

      {view.noStock && (
        <Notice>
          No segment stock entered: gross profit excludes stock movement.{" "}
          <Link href={scoped("/inputs")} className={linkClass}>
            Add segment stock
          </Link>{" "}
          in Adjustments.
        </Notice>
      )}

      <SegmentChartCards data={view.chartData} />

      <SegmentTableCard
        rows={[...view.segments, view.total]}
        periodLabel={period.label}
        priorLabel={view.prior?.label ?? null}
        priorByName={view.priorByName}
        fmt={fmtAmount}
      />
    </section>
  );
}
