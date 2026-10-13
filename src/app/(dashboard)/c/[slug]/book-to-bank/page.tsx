import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { getReportTabs } from "@/lib/data/report-tabs";

import { BranchScopeSelector } from "@/components/branch-scope-selector";
import { KpiTile } from "@/components/kpi";
import {
  getCompany,
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getReportScope,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { getFmtCompact } from "@/lib/data/unit";
import type { TemplateLine } from "@/lib/mis/catalog";
import { bookToBankLines, computeBookToBank } from "@/lib/mis/book-to-bank";
import { fyDisplay } from "@/lib/format";
import { fyLabel } from "@/lib/mis/period";
import { QuarterFilter } from "@/components/quarter-filter";
import { parseQuarters, planColumns, quarterLabel, quartersParam, quartersWithData, type Quarter } from "@/lib/mis/quarters";
import { buildYtd } from "@/lib/mis/ytd";
import type { MasterRowScope } from "@/lib/mis/types";
import { scopedLink } from "@/lib/data/scoped-link";
import { activeCompanyId } from "@/lib/data/company-context";

import { BookToBankTable, type BtbColumn } from "./book-to-bank-table";

export const metadata = { title: "Book to Bank" };

async function btbForPeriod(periodId: string, template: TemplateLine[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return computeBookToBank(rows, manual, template);
}

export default async function BookToBankPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const fmtCompact = await getFmtCompact();
  const { slug } = await params;
  const selectedQuarters = parseQuarters((await searchParams).q);
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const current = await getSelectedPeriod(companyId ?? undefined);
  if (!current) {
    return (
      <section>
        <PageHeader title="Book to Bank" filters={<PeriodSelector />} />
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

  const [company, fyPeriods, template, reportScope, segments] = await Promise.all([
    getCompany(companyId ?? undefined),
    getFyPeriods(current, companyId ?? undefined),
    getMisTemplate(companyId ?? undefined),
    getReportScope(companyId ?? undefined, "book_to_bank"),
    getMisSegments(companyId ?? undefined),
  ]);
  const { scope } = reportScope;
  const fyStartNo = company?.fy_start_month ?? 4;
  const results = await Promise.all(fyPeriods.map((p) => btbForPeriod(p.id, template, scope)));

  // Cash opens at the quarter's / year's first month and closes at its last; every other line is a flow.
  const CASH_BALANCES = { first: ["bank-opening"], last: ["bank-closing"] };
  const monthLines = fyPeriods.map((_, i) => bookToBankLines(results[i]));
  const monthColumns: BtbColumn[] = planColumns(
    fyPeriods.map((p, i) => ({ p, lines: monthLines[i] })),
    (x) => x.p.month,
    selectedQuarters,
    fyStartNo,
  ).map((entry) =>
    entry.kind === "month"
      ? { key: entry.item.p.id, label: entry.item.p.label, lines: entry.item.lines }
      : {
          key: `q${entry.quarter}`,
          label: quarterLabel(entry.quarter, entry.items.length),
          lines: buildYtd(entry.items.map((x) => x.lines), CASH_BALANCES),
        },
  );

  // A single month is already its own YTD — no point repeating the column.
  // Every Book to Bank line is a flow, so the same summing YTD builder used
  // for the P&L is correct here too — there's no opening/closing-stock-style
  // balance among these lines for it to mishandle.
  const columns: BtbColumn[] =
    monthColumns.length > 1
      ? [
          ...monthColumns,
          { key: "ytd", label: "YTD", lines: buildYtd(monthLines, CASH_BALANCES) },
        ]
      : monthColumns;

  const currentIdx = fyPeriods.findIndex((p) => p.id === current.id);
  const b = results[currentIdx] ?? results[results.length - 1];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Book to Bank"
        subtitle={
          <>
            Cash flow — profit to closing bank — {current.label} ·{" "}
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
              branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
              groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
              depth={reportScope.depth}
              current={reportScope.current}
            />
          </>
        }
      />

      <ReportTabs tabs={await getReportTabs(companyId ?? undefined, segments.length > 0)} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          label="Opening Cash / OD"
          value={fmtCompact(b.openingCash)}
          tone={b.openingCash < 0 ? "neg" : "default"}
        />
        <KpiTile
          label="Closing Cash / OD"
          value={fmtCompact(b.closingCash)}
          tone={b.closingCash < 0 ? "neg" : "default"}
        />
        <KpiTile
          label="Net Change"
          value={fmtCompact(b.difference)}
          tone={b.difference >= 0 ? "pos" : "neg"}
        />
        <KpiTile
          label="Withdrawable Cash"
          value={fmtCompact(b.withdrawableCash)}
          tone={b.withdrawableCash >= 0 ? "pos" : "neg"}
        />
      </div>

      <BookToBankTable columns={columns} />
    </section>
  );
}
