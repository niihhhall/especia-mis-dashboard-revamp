import Link from "next/link";

import { KpiTile } from "@/components/kpi";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { activeCompanyId } from "@/lib/data/company-context";
import { getBudget, getManualInputs, getMasterRows, getMisSegments, getMisTemplate, getSelectedPeriod } from "@/lib/data/mis";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";
import { fmtPct } from "@/lib/format";
import { getFmtCompact } from "@/lib/data/unit";
import { computeBudgetPnl } from "@/lib/mis/budget";
import { computePnl } from "@/lib/mis/pnl";

import { BudgetVsActualTable } from "./budget-vs-actual-table";

export const metadata = { title: "Budget vs Actual" };

export default async function BudgetVsActualPage({ params }: { params: Promise<{ slug: string }> }) {
  const fmtCompact = await getFmtCompact();
  const { slug } = await params;
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const current = await getSelectedPeriod(companyId ?? undefined);

  if (!current) {
    return (
      <section>
        <PageHeader title="Budget vs Actual" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No data yet.{" "}
          <Link href={scoped("/upload")} className="font-medium text-primary underline">
            Upload a Trial Balance
          </Link>{" "}
          first.
        </div>
      </section>
    );
  }

  const [template, rows, manual, budgetByKey, segments] = await Promise.all([
    getMisTemplate(companyId ?? undefined),
    getMasterRows(current.id),
    getManualInputs(current.id),
    getBudget(current.id),
    getMisSegments(companyId ?? undefined),
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
        title="Budget vs Actual"
        subtitle={<>{current.label} — Budget figures entered via Excel upload</>}
        filters={<PeriodSelector />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs tabs={await getReportTabs(companyId ?? undefined, segments.length > 0)} />
      </div>

      {budgetEmpty && (
        <div className="rounded-lg border border-primary/20 bg-primary/12 p-3 text-sm text-primary">
          No budget entered for {current.label} yet —{" "}
          <Link href={scoped("/budget")} className="font-medium underline">
            upload a Budget template
          </Link>{" "}
          to see a comparison here.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Budget Revenue" value={fmtCompact(budgetPnl.totals.revenue)} />
        <KpiTile label="Actual Revenue" value={fmtCompact(actualPnl.totals.revenue)} />
        <KpiTile
          label="Revenue Variance"
          value={fmtCompact(revVariance)}
          sub={revPct !== null ? `${fmtPct(revPct)} vs budget` : undefined}
          tone={revVariance >= 0 ? "pos" : "neg"}
        />
        <KpiTile
          label="EBT Variance"
          value={fmtCompact(ebtVariance)}
          sub={ebtPct !== null ? `${fmtPct(ebtPct)} vs budget` : undefined}
          tone={ebtVariance >= 0 ? "pos" : "neg"}
        />
      </div>

      <BudgetVsActualTable actual={actualPnl.lines} budget={budgetPnl.lines} template={template} />
    </section>
  );
}
