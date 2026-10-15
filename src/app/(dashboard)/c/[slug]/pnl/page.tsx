import Link from "next/link";

import { StatementTable } from "@/components/dashboard/statement-table";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Notice } from "@/components/shared/notice";
import { activeCompanyId } from "@/lib/data/company-context";
import { getSelectedPeriod } from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtAmount, getFmtCompact } from "@/lib/data/unit";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";
import { parseQuarters, quartersParam, quartersWithData, type Quarter } from "@/lib/mis/quarters";
import { visibleReportTabs, withChannelTabs } from "@/lib/report-tabs";
import type { ManualInputs } from "@/lib/mis/types";

import { loadPnlView } from "./pnl-data";
import { PnlFilters } from "./pnl-filters";
import { PnlKpis } from "./pnl-kpis";
import { pnlHead, pnlRows } from "./pnl-rows";

export const metadata = { title: "P&L detail" };

const LINK = "font-medium text-text-primary underline underline-offset-2";

export default async function PnlPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scope?: string; view?: string; q?: string }>;
}) {
  const [fmtCompact, fmtAmount] = await Promise.all([getFmtCompact(), getFmtAmount()]);
  const { slug } = await params;
  const { scope: scopeOverride, view, q: qParam } = await searchParams;
  const selectedQuarters = parseQuarters(qParam);
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const current = await getSelectedPeriod(companyId);

  if (!current) {
    return (
      <section>
        <PageHeader title="P&L detail" filters={<PeriodSelector />} />
        <EmptyState
          title="No data yet."
          description={
            <>
              <Link href={scoped("/upload")} className={LINK}>
                Upload a trial balance
              </Link>{" "}
              to build the Profit Statement.
            </>
          }
        />
      </section>
    );
  }

  const v = await loadPnlView(companyId, current, scopeOverride, view, selectedQuarters);
  const { reportScope, branchWiseActive } = v;
  const inputsEmpty = Object.keys(v.manual as ManualInputs).length === 0;

  // Both toggle links carry the RESOLVED scope explicitly (not the raw
  // `?scope=` param, which may be absent when the scope came from the
  // cookie) so either link is correct and bookmarkable regardless of how
  // the current scope was actually chosen.
  const scopeQuery = reportScope.current !== "consolidated" ? `scope=${reportScope.current}` : "";
  // The quarter buttons keep the resolved scope on the URL and add or drop `q`; nothing else changes.
  const quarterHref = (qs: Quarter[]) => {
    const query = [scopeQuery, qs.length ? `q=${quartersParam(qs)}` : ""].filter(Boolean).join("&");
    return scoped(`/pnl${query ? `?${query}` : ""}`);
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="P&L detail"
        subtitle={
          <>
            Profit statement: {current.label} · {fyDisplay(fyLabel(current.month, v.company?.fy_start_month ?? 4))}
            {branchWiseActive ? (
              <span> · Branch-wise ({v.branchWiseBranches.length} branches)</span>
            ) : (
              v.fyMonthsShown > 1 && <span> · {v.fyMonthsShown} months to date</span>
            )}
          </>
        }
        filters={
          <PnlFilters
            showQuarters={!branchWiseActive && v.fyPeriods.length > 1}
            selectedQuarters={selectedQuarters}
            availableQuarters={quartersWithData(v.fyPeriods, (p) => p.month, v.fyStartNo)}
            fyStartNo={v.fyStartNo}
            quarterHref={quarterHref}
            canBranchWise={v.canBranchWise}
            branchWiseActive={branchWiseActive}
            monthlyHref={scoped(`/pnl${scopeQuery ? `?${scopeQuery}` : ""}`)}
            branchWiseHref={scoped(`/pnl?${[scopeQuery, "view=branches"].filter(Boolean).join("&")}`)}
            branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
            groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
            depth={reportScope.depth}
            current={reportScope.current}
          />
        }
      />

      <ReportTabs tabs={withChannelTabs(visibleReportTabs(v.segments.length > 0), reportScope.branchGroups, v.scopeConfig)} />

      {inputsEmpty && (
        <Notice>
          No adjustments entered for {current.label}. Closing stock, depreciation and interest are treated as zero:{" "}
          <Link href={scoped("/inputs")} className={LINK}>
            enter Adjustments
          </Link>{" "}
          for an accurate statement.
        </Notice>
      )}

      <PnlKpis revenue={v.totals.revenue} grossProfit={v.totals.grossProfit} ebitda={v.totals.ebitda} ebt={v.totals.ebt} fmt={fmtCompact} />

      <Card flush>
        <StatementTable
          label="P&L detail"
          firstColumnLabel="Particulars"
          columns={pnlHead(v.columns)}
          rows={pnlRows(v.columns, fmtAmount)}
          maxHeight="screen"
        />
      </Card>
    </section>
  );
}
