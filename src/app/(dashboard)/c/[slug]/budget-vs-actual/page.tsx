import Link from "next/link";

import { StatementTable } from "@/components/dashboard/statement-table";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Notice } from "@/components/shared/notice";
import { activeCompanyId } from "@/lib/data/company-context";
import { getBudget, getManualInputs, getMasterRows, getMisSegments, getMisTemplate, getSelectedPeriod } from "@/lib/data/mis";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtAmount, getFmtCompact, getUnitCaption } from "@/lib/data/unit";
import { computeBudgetPnl } from "@/lib/mis/budget";
import { computePnl } from "@/lib/mis/pnl";

import { BvaKpis } from "./bva-kpis";
import { bvaHead, bvaRows } from "./bva-rows";

export const metadata = { title: "Budget vs actual" };

const LINK = "font-medium text-text-primary underline underline-offset-2";

export default async function BudgetVsActualPage({ params }: { params: Promise<{ slug: string }> }) {
  const [fmtCompact, fmtAmount, caption] = await Promise.all([getFmtCompact(), getFmtAmount(), getUnitCaption()]);
  const { slug } = await params;
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const current = await getSelectedPeriod(companyId);
  if (!current) {
    return (
      <section>
        <PageHeader title="Budget vs actual" filters={<PeriodSelector />} />
        <EmptyState
          title="No data yet."
          description={
            <>
              <Link href={scoped("/upload")} className={LINK}>
                Upload a trial balance
              </Link>{" "}
              first.
            </>
          }
        />
      </section>
    );
  }
  const [template, rows, manual, budgetByKey, segments] = await Promise.all([
    getMisTemplate(companyId),
    getMasterRows(current.id),
    getManualInputs(current.id),
    getBudget(current.id),
    getMisSegments(companyId),
  ]);
  const actualPnl = computePnl(rows, manual, template);
  const budgetPnl = computeBudgetPnl(budgetByKey, template);
  const budgetEmpty = Object.keys(budgetByKey).length === 0;
  const revVariance = actualPnl.totals.revenue - budgetPnl.totals.revenue;
  const ebtVariance = actualPnl.totals.ebt - budgetPnl.totals.ebt;
  const revPct = budgetPnl.totals.revenue !== 0 ? revVariance / budgetPnl.totals.revenue : null;
  const ebtPct = budgetPnl.totals.ebt !== 0 ? ebtVariance / budgetPnl.totals.ebt : null;
  return (
    <section className="space-y-6">
      <PageHeader
        title="Budget vs actual"
        subtitle={<>{current.label}: Budget figures entered via Excel upload</>}
        filters={<PeriodSelector />}
      />
      <ReportTabs tabs={await getReportTabs(companyId, segments.length > 0)} />
      {budgetEmpty && (
        <Notice>
          No budget entered for {current.label} yet:{" "}
          <Link href={scoped("/budget")} className={LINK}>
            upload a Budget template
          </Link>{" "}
          to see a comparison here.
        </Notice>
      )}
      <BvaKpis
        budgetRevenue={budgetPnl.totals.revenue}
        actualRevenue={actualPnl.totals.revenue}
        revVariance={revVariance}
        ebtVariance={ebtVariance}
        revPct={revPct}
        ebtPct={ebtPct}
        fmt={fmtCompact}
      />
      <Card flush>
        <StatementTable
          label="Budget vs actual"
          firstColumnLabel="Particulars"
          columns={bvaHead(caption)}
          rows={bvaRows(actualPnl.lines, budgetPnl.lines, template, fmtAmount)}
          columnWidth="lg"
        />
      </Card>
    </section>
  );
}
