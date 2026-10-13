import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { visibleReportTabs, withChannelTabs } from "@/lib/report-tabs";

import { BranchScopeSelector } from "@/components/branch-scope-selector";
import { ChartCard } from "@/components/chart-card";
import { KpiTile } from "@/components/kpi";
import {
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getReportScope,
  getReportScopeConfig,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { computeCcc, type CccMonth } from "@/lib/mis/ccc";
import type { MasterRowScope } from "@/lib/mis/types";
import { scopedLink } from "@/lib/data/scoped-link";
import { activeCompanyId } from "@/lib/data/company-context";

import { CccComponentsChart } from "./ccc-chart";
import { CccTable, type CccColumn } from "./ccc-table";

export const metadata = { title: "Cash Conversion" };

async function fyMonth(periodId: string, scope: MasterRowScope): Promise<CccMonth> {
  const [master, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return { master, manual };
}

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
  const companyId = await activeCompanyId(slug);
  const period = await getSelectedPeriod(companyId ?? undefined);
  if (!period) {
    return (
      <section>
        <PageHeader title="Cash Conversion Cycle" filters={<PeriodSelector />} />
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

  // The reference workbook's CCC sheet averages every balance against the
  // financial year's OPENING position and annualises off the YTD run-rate —
  // so every month's own figure needs the FY run up to and including it, not
  // just that one month. Each column below is computeCcc() over a longer
  // prefix of the same FY array, exactly mirroring how the reference sheet's
  // own monthly columns each read further back into the year.
  const [fyPeriods, template, reportScope, segments, scopeConfig] = await Promise.all([
    getFyPeriods(period, companyId ?? undefined),
    getMisTemplate(companyId ?? undefined),
    getReportScope(companyId ?? undefined, "ccc", scopeOverride),
    getMisSegments(companyId ?? undefined),
    getReportScopeConfig(companyId ?? undefined),
  ]);
  const { scope } = reportScope;
  const fyMonths = await Promise.all(fyPeriods.map((p) => fyMonth(p.id, scope)));
  const monthlyResults = fyMonths.map((_, i) => computeCcc(fyMonths.slice(0, i + 1), template));

  const currentIdx = fyPeriods.findIndex((p) => p.id === period.id);
  const c = monthlyResults[currentIdx] ?? monthlyResults[monthlyResults.length - 1];
  const priorIdx = currentIdx - 1;
  const p = priorIdx >= 0 ? monthlyResults[priorIdx] : null;
  const priorLabel = priorIdx >= 0 ? fyPeriods[priorIdx].label : null;
  const showPrior = Boolean(p && priorLabel);

  const monthColumns: CccColumn[] = fyPeriods.map((fp, i) => ({
    key: fp.id,
    label: fp.label,
    c: monthlyResults[i],
  }));
  // Ratios and balances aren't flows, so — matching the reference workbook —
  // the YTD column repeats the latest month rather than summing across them.
  const columns: CccColumn[] =
    monthColumns.length > 1 ? [...monthColumns, { key: "ytd", label: "YTD", c }] : monthColumns;

  const bars = [
    { name: "Debtor Days", value: c.dcp },
    { name: "Inventory Days", value: c.icp },
    { name: "Creditor Days", value: c.cpp },
    { name: "CCC", value: c.ccc, emphasis: true },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Cash Conversion Cycle"
        subtitle={
          <>
            Working-capital efficiency — {period.label}
            {showPrior && <span> vs {priorLabel}</span>}
            {columns.length > 1 && <span> · {fyPeriods.length} months to date</span>}
          </>
        }
        filters={<PeriodSelector />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs tabs={withChannelTabs(visibleReportTabs(segments.length > 0), reportScope.branchGroups, scopeConfig)} />
        <BranchScopeSelector
          branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
          groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
          depth={reportScope.depth}
          current={reportScope.current}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          label="Cash Conversion Cycle"
          value={`${c.ccc}d`}
          sub={showPrior ? `${priorLabel}: ${p!.ccc}d` : "DCP + ICP − CPP"}
          tone={c.ccc <= 45 ? "pos" : "neg"}
        />
        <KpiTile
          label="Debtor Collection"
          value={`${c.dcp}d`}
          sub={showPrior ? `${priorLabel}: ${p!.dcp}d` : undefined}
        />
        <KpiTile
          label="Inventory Period"
          value={`${c.icp}d`}
          sub={showPrior ? `${priorLabel}: ${p!.icp}d` : undefined}
        />
        <KpiTile
          label="Creditor Payment"
          value={`${c.cpp}d`}
          sub={showPrior ? `${priorLabel}: ${p!.cpp}d` : undefined}
        />
      </div>

      <ChartCard title="CCC components (days)">
        <CccComponentsChart data={bars} />
      </ChartCard>

      <CccTable columns={columns} />

      <p className="max-w-prose break-words text-pretty rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        Debtor, creditor and inventory balances are each averaged against the financial year&rsquo;s
        opening position (1-{fyPeriods[0]?.label.slice(0, 3) ?? "Apr"}) — not the prior
        month&rsquo;s — and
        turnover is annualised off the year-to-date run-rate, matching the source MIS methodology
        (the &ldquo;Working Sheet&rdquo; above shows every intermediate figure). Creditors are taken
        on the liability side, so the creditor payment period can read negative when the closing
        creditor balance is small relative to purchases.
      </p>
    </section>
  );
}
