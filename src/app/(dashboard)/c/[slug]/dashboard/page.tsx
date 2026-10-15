import Link from "next/link";

import { CompanyPageHeader } from "@/components/dashboard/company-page-header";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { BranchScopeSelector } from "@/components/shared/branch-scope-selector";
import { EmptyState } from "@/components/shared/empty-state";
import { getSessionProfile } from "@/lib/auth/session";
import { activeCompanyId } from "@/lib/data/company-context";
import { getCompany, getSelectedPeriod } from "@/lib/data/mis";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtCompact, getUnitCaption } from "@/lib/data/unit";

import { BalanceSheetCard } from "./balance-sheet-card";
import { balanceRows, loadDashboardView } from "./dashboard-data";
import { DashboardKpis } from "./dashboard-kpis";
import { ProfitSummaryCard } from "./profit-summary-card";

export const metadata = { title: "Dashboard" };

export default async function ConsolidatedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const fmtCompact = await getFmtCompact();
  const unitText = await getUnitCaption();
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const period = await getSelectedPeriod(companyId);
  const company = await getCompany(companyId);

  if (!period || !company) {
    const isStaff = (await getSessionProfile())?.role !== "company";
    return (
      <section>
        <PageHeader title="Dashboard" filters={<PeriodSelector />} />
        <EmptyState
          title="No reporting period published yet."
          description={
            isStaff ? (
              <>
                <Link href={scoped("/upload")} className="font-medium text-text-primary underline underline-offset-2">
                  Upload a trial balance
                </Link>{" "}
                to publish the first month.
              </>
            ) : (
              "Your CA will publish this month's MIS here."
            )
          }
        />
      </section>
    );
  }

  const view = await loadDashboardView({ companyId, period, fmt: fmtCompact });
  const { reportScope } = view;

  return (
    <section className="space-y-6">
      <CompanyPageHeader company={company} period={period} />

      <DashboardKpis items={view.kpis} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs tabs={await getReportTabs(companyId, view.segments.length > 0)} />
        <BranchScopeSelector
          branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
          groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
          depth={reportScope.depth}
          current={reportScope.current}
        />
      </div>

      <ProfitSummaryCard columns={view.summaryColumns} unitText={unitText} months={view.months} fmt={fmtCompact} />
      <BalanceSheetCard columns={view.balanceCols} rows={balanceRows} unitText={unitText} fmt={fmtCompact} />

      <p className="text-body text-text-secondary">
        Full line-by-line detail is under{" "}
        <Link href={scoped("/pnl")} className="font-medium text-text-primary underline underline-offset-2">
          P&amp;L Detail
        </Link>
        .
      </p>
    </section>
  );
}
