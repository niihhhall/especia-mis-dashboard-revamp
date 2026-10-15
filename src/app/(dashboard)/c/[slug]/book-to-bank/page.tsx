import Link from "next/link";

import { StatementTable } from "@/components/dashboard/statement-table";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { BranchScopeSelector } from "@/components/shared/branch-scope-selector";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { QuarterFilter } from "@/components/shared/quarter-filter";
import { activeCompanyId } from "@/lib/data/company-context";
import { getSelectedPeriod } from "@/lib/data/mis";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtAmount, getFmtCompact } from "@/lib/data/unit";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";
import { parseQuarters, quartersParam, quartersWithData, type Quarter } from "@/lib/mis/quarters";

import { loadBtbView } from "./btb-data";
import { BtbKpis } from "./btb-kpis";
import { btbHead, btbRows } from "./btb-rows";

export const metadata = { title: "Book to bank" };

export default async function BookToBankPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [fmtCompact, fmtAmount] = await Promise.all([getFmtCompact(), getFmtAmount()]);
  const { slug } = await params;
  const selectedQuarters = parseQuarters((await searchParams).q);
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const current = await getSelectedPeriod(companyId);
  if (!current) {
    return (
      <section>
        <PageHeader title="Book to bank" filters={<PeriodSelector />} />
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

  const { company, fyPeriods, fyStartNo, columns, b, reportScope, segments } = await loadBtbView(companyId, current, selectedQuarters);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Book to bank"
        subtitle={
          <>
            Cash flow: profit to closing bank: {current.label} ·{" "}
            {fyDisplay(fyLabel(current.month, company?.fy_start_month ?? 4))}
            {columns.length > 1 && <span> · {fyPeriods.length} months to date</span>}
          </>
        }
        filters={
          <>
            <PeriodSelector />
            {fyPeriods.length > 1 && (
              <QuarterFilter
                selected={selectedQuarters}
                available={quartersWithData(fyPeriods, (p) => p.month, fyStartNo)}
                fyStartMonthNo={fyStartNo}
                buildHref={(qs: Quarter[]) => scoped(qs.length ? `/book-to-bank?q=${quartersParam(qs)}` : "/book-to-bank")}
              />
            )}
            <BranchScopeSelector
              branches={reportScope.branches.filter((br) => !br.archivedAt).map((br) => ({ id: br.id, label: br.label, groupId: br.groupId }))}
              groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
              depth={reportScope.depth}
              current={reportScope.current}
            />
          </>
        }
      />

      <ReportTabs tabs={await getReportTabs(companyId, segments.length > 0)} />

      <BtbKpis
        openingCash={b.openingCash}
        closingCash={b.closingCash}
        difference={b.difference}
        withdrawableCash={b.withdrawableCash}
        fmt={fmtCompact}
      />

      <Card flush>
        <StatementTable label="Book to bank" firstColumnLabel="Particulars" columns={btbHead(columns)} rows={btbRows(columns, fmtAmount)} />
      </Card>
    </section>
  );
}
