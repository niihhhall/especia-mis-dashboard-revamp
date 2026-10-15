import Link from "next/link";

import { StatementTable } from "@/components/dashboard/statement-table";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { BranchScopeSelector } from "@/components/shared/branch-scope-selector";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { activeCompanyId } from "@/lib/data/company-context";
import { getSelectedPeriod } from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtAmount } from "@/lib/data/unit";
import { visibleReportTabs, withChannelTabs } from "@/lib/report-tabs";

import { CccComponentsCard } from "./ccc-components-card";
import { loadCccView } from "./ccc-data";
import { CccKpis } from "./ccc-kpis";
import { SUMMARY_ROWS, WORKING_ROWS, cccHead, cccRows } from "./ccc-rows";

export const metadata = { title: "Cash conversion" };

export default async function CashConversionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { slug } = await params;
  const { scope: scopeOverride } = await searchParams;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const period = await getSelectedPeriod(companyId);
  if (!period) {
    return (
      <section>
        <PageHeader title="Cash conversion cycle" filters={<PeriodSelector />} />
        <EmptyState
          title="No data yet."
          description={
            <>
              <Link href={scoped("/upload")} className="font-medium text-text-primary underline underline-offset-2">
                Upload a trial balance
              </Link>
              .
            </>
          }
        />
      </section>
    );
  }

  const [view, money] = await Promise.all([loadCccView(companyId, period, scopeOverride), getFmtAmount()]);
  const { fyPeriods, columns, reportScope } = view;
  const head = cccHead(columns);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Cash conversion cycle"
        subtitle={
          <>
            Working-capital efficiency: {period.label}
            {view.prior && <span> vs {view.prior.label}</span>}
            {columns.length > 1 && <span> · {fyPeriods.length} months to date</span>}
          </>
        }
        filters={<PeriodSelector />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs tabs={withChannelTabs(visibleReportTabs(view.segments.length > 0), reportScope.branchGroups, view.scopeConfig)} />
        <BranchScopeSelector
          branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
          groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
          depth={reportScope.depth}
          current={reportScope.current}
        />
      </div>

      <CccKpis c={view.c} prior={view.prior} />

      {/* 70/30: the ratio block beside its chart, equal heights; stacked below 1280px. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <Card flush className="h-full">
          <StatementTable label="Cash conversion" firstColumnLabel="Particulars" refLabel="Ref." columns={head} rows={cccRows(SUMMARY_ROWS, columns, money)} />
        </Card>
        <CccComponentsCard bars={view.bars} />
      </div>

      <Card title="Working sheet" flush>
        <StatementTable label="Working sheet" firstColumnLabel="Particulars" refLabel="Ref." columns={head} rows={cccRows(WORKING_ROWS, columns, money)} />
      </Card>

      <p className="max-w-prose break-words text-pretty rounded-lg border border-border bg-surface p-4 text-body text-text-secondary">
        Debtor, creditor and inventory balances are each averaged against the financial year&rsquo;s
        opening position (1-{fyPeriods[0]?.label.slice(0, 3) ?? "Apr"}): not the prior
        month&rsquo;s: and
        turnover is annualised off the year-to-date run-rate, matching the source MIS methodology
        (the &ldquo;Working Sheet&rdquo; above shows every intermediate figure). Creditors are taken
        on the liability side, so the creditor payment period can read negative when the closing
        creditor balance is small relative to purchases.
      </p>
    </section>
  );
}
