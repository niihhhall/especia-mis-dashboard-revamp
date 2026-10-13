import Link from "next/link";

import { BranchScopeSelector } from "@/components/branch-scope-selector";
import { CompanyPageHeader } from "@/components/dashboard/company-page-header";
import { KpiDelta } from "@/components/kpi-delta";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { getSessionProfile } from "@/lib/auth/session";
import { getReportTabs } from "@/lib/data/report-tabs";
import { activeCompanyId } from "@/lib/data/company-context";
import {
  getCompany,
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getPriorPeriod,
  getReportScope,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { fmtPct, plural } from "@/lib/format";
import { getFmtCompact, getUnitCaption } from "@/lib/data/unit";
import type { TemplateLine } from "@/lib/mis/catalog";
import { computeBookToBank } from "@/lib/mis/book-to-bank";
import { computeCcc } from "@/lib/mis/ccc";
import { computePnl } from "@/lib/mis/pnl";
import type { MasterRowScope } from "@/lib/mis/types";
import { scopedLink } from "@/lib/data/scoped-link";

export const metadata = { title: "Dashboard" };

/**
 * Everything the consolidated view needs for one month. Shares ONE row
 * fetch across P&L/Book-to-Bank/CCC, so `scope` here is the MOST
 * RESTRICTIVE of those three reports' own configured depths (resolved by
 * `getReportScope(companyId, ["pnl","book_to_bank","ccc"])` below) — this
 * page can't honor a deeper scope for P&L than Book to Bank's own setting
 * allows while reading both from the same rows.
 */
async function monthSnapshot(periodId: string, template: TemplateLine[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return {
    master: rows,
    manual,
    pnl: computePnl(rows, manual, template),
    btb: computeBookToBank(rows, manual, template),
  };
}

/** Just the figures the summary needs — so the YTD roll-up can reuse it. */
interface SummaryTotals {
  revenue: number;
  cogs: number;
  grossProfit: number;
  indirectIncome: number;
  indirectExpense: number;
  ebt: number;
}

/** The condensed six-line profit summary, as a client reads it. */
function summaryRows(t: SummaryTotals) {
  return [
    { key: "sales", label: "Sales", value: t.revenue, strong: true },
    { key: "cogs", label: "COGS", value: t.cogs },
    { key: "gp", label: "Gross Profit", value: t.grossProfit, strong: true },
    { key: "ii", label: "Indirect Income", value: t.indirectIncome },
    { key: "fc", label: "Indirect Expenses", value: t.indirectExpense },
    { key: "ebt", label: "Net Profit (EBT)", value: t.ebt, strong: true },
  ];
}

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
  const companyId = await activeCompanyId(slug);
  const period = await getSelectedPeriod(companyId ?? undefined);
  const company = await getCompany(companyId ?? undefined);

  if (!period || !company) {
    const isStaff = (await getSessionProfile())?.role !== "company";
    return (
      <section>
        <PageHeader title="Dashboard" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p>No reporting period published yet.</p>
          <p className="mt-1">
            {isStaff ? (
              <>
                <Link href={scoped("/upload")} className="font-semibold text-primary underline underline-offset-2">
                  Upload a Trial Balance
                </Link>{" "}
                to publish the first month.
              </>
            ) : (
              "Your CA will publish this month's MIS here."
            )}
          </p>
        </div>
      </section>
    );
  }

  const [fyPeriods, prior, template, reportScope, segments] = await Promise.all([
    getFyPeriods(period, companyId ?? undefined),
    getPriorPeriod(period, companyId ?? undefined),
    getMisTemplate(companyId ?? undefined),
    getReportScope(companyId ?? undefined, ["pnl", "book_to_bank", "ccc"]),
    getMisSegments(companyId ?? undefined),
  ]);
  const { scope } = reportScope;
  const snapshots = await Promise.all(fyPeriods.map((p) => monthSnapshot(p.id, template, scope)));

  const idx = fyPeriods.findIndex((p) => p.id === period.id);
  const current = snapshots[idx] ?? snapshots[snapshots.length - 1];
  // Prior month may sit in the previous FY (April's comparison is March), so it
  // is fetched separately rather than taken from the FY slice.
  const priorSnap = prior ? await monthSnapshot(prior.id, template, scope) : null;

  const t = current.pnl.totals;
  const pt = priorSnap?.pnl.totals;

  // CCC needs the whole FY run, not a single month — every balance is
  // averaged against the FY's OPENING position, and turnover is annualised
  // off the YTD run-rate. Each month's own CCC is therefore this same FY
  // array read up to that month — computed once per month here so the
  // Balance Sheet Summary table below can show every month side by side, not
  // just the current one.
  const cccByMonth = snapshots.map((_, i) =>
    computeCcc(
      snapshots.slice(0, i + 1).map((s) => ({ master: s.master, manual: s.manual })),
      template,
    ),
  );
  const ccc = cccByMonth[idx] ?? cccByMonth[cccByMonth.length - 1];
  // "Prior" for CCC is this same FY run one month shorter, not the cross-FY
  // `priorSnap` above (there's no coherent "FY-to-date" for a month in the
  // previous FY).
  const priorCcc = idx > 0 ? cccByMonth[idx - 1] : null;

  // YTD sums the flows across the financial year to date.
  const ytd = snapshots.reduce(
    (a, s) => ({
      revenue: a.revenue + s.pnl.totals.revenue,
      cogs: a.cogs + s.pnl.totals.cogs,
      grossProfit: a.grossProfit + s.pnl.totals.grossProfit,
      indirectIncome: a.indirectIncome + s.pnl.totals.indirectIncome,
      indirectExpense: a.indirectExpense + s.pnl.totals.indirectExpense,
      ebt: a.ebt + s.pnl.totals.ebt,
    }),
    { revenue: 0, cogs: 0, grossProfit: 0, indirectIncome: 0, indirectExpense: 0, ebt: 0 },
  );

  const ytdLabel = `YTD (${fyPeriods[0]?.label.slice(0, 3)}–${period.label.slice(0, 3)})`;
  const columns = [
    ...fyPeriods.map((p, i) => ({ key: p.id, label: p.label, rows: summaryRows(snapshots[i].pnl.totals) })),
    { key: "ytd", label: ytdLabel, rows: summaryRows(ytd) },
  ];
  const rowSkeleton = summaryRows(t);

  // Balances, not flows — the export's own Summary sheet never sums these
  // across months either, so YTD here repeats the latest month rather than
  // adding balances together (which would be meaningless for a point-in-time
  // figure like a closing debtor balance).
  const fyStartLabel = fyPeriods[0]?.label.slice(0, 3) ?? "Apr";
  const openingColumn = {
    key: "opening",
    label: `${fyStartLabel} Opening`,
    // Every month's CCC result carries the SAME FY-opening figures (they're
    // always read off the FY's first month), so any one of them will do.
    debtors: ccc.openingDebtors,
    creditors: ccc.openingCreditors,
    inventory: ccc.openingInventory,
    // Cash has no such field on CccResult — April's own openingCash IS the
    // FY-opening figure, by definition, since it's the FY's first month.
    cash: snapshots[0]?.btb.openingCash ?? 0,
    cccDays: null as number | null, // CCC is a computed metric, not a balance — no "opening" value.
  };
  const bsColumns = [
    openingColumn,
    ...fyPeriods.map((p, i) => ({
      key: p.id,
      label: p.label,
      debtors: cccByMonth[i].closingDebtors,
      creditors: cccByMonth[i].closingCreditors,
      inventory: cccByMonth[i].closingInventory,
      cash: snapshots[i].btb.closingCash,
      cccDays: cccByMonth[i].ccc as number | null,
    })),
    {
      key: "ytd",
      label: ytdLabel,
      debtors: ccc.closingDebtors,
      creditors: ccc.closingCreditors,
      inventory: ccc.closingInventory,
      cash: current.btb.closingCash,
      cccDays: ccc.ccc as number | null,
    },
  ];
  const bsRows: { key: string; label: string; get: (c: (typeof bsColumns)[number]) => number | null; days?: boolean }[] = [
    { key: "debtors", label: "Sundry Debtors", get: (c) => c.debtors },
    { key: "creditors", label: "Sundry Creditors", get: (c) => c.creditors },
    { key: "inventory", label: "Inventory", get: (c) => c.inventory },
    { key: "cash", label: "Cash, Bank & OD", get: (c) => c.cash },
    { key: "cccDays", label: "CCC (Days)", get: (c) => c.cccDays, days: true },
  ];

  return (
    <section className="space-y-5">
      <CompanyPageHeader company={company} period={period} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <KpiDelta label={`Revenue · ${period.label}`} value={t.revenue} prior={pt?.revenue} />
        <KpiDelta label="Gross Profit" value={t.grossProfit} prior={pt?.grossProfit} />
        <KpiDelta label="Net Profit (EBT)" value={t.ebt} prior={pt?.ebt} />
        <KpiDelta
          label="Sundry Debtors"
          value={ccc.closingDebtors}
          prior={priorCcc?.closingDebtors}
          goodWhenUp={false}
        />
        <KpiDelta
          label="Sundry Creditors"
          value={ccc.closingCreditors}
          prior={priorCcc?.closingCreditors}
        />
        <KpiDelta
          label="Inventory"
          value={ccc.closingInventory}
          prior={priorCcc?.closingInventory}
          goodWhenUp={false}
        />
        <KpiDelta
          label="Cash Conversion Cycle"
          value={ccc.ccc}
          prior={priorCcc?.ccc}
          format="days"
          goodWhenUp={false}
        />
        <KpiDelta
          label="Loan / Liability"
          value={current.btb.loanChange}
          prior={priorSnap?.btb.loanChange}
        />
        <KpiDelta
          label="Change in Capital"
          value={current.btb.capitalChange}
          prior={priorSnap?.btb.capitalChange}
        />
        <KpiDelta
          label="Fixed Assets"
          value={current.btb.fixedAssetChange}
          prior={priorSnap?.btb.fixedAssetChange}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs tabs={await getReportTabs(companyId ?? undefined, segments.length > 0)} />
        <BranchScopeSelector
          branches={reportScope.branches.filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.label, groupId: b.groupId }))}
          groups={reportScope.branchGroups.map((g) => ({ id: g.id, label: g.label }))}
          depth={reportScope.depth}
          current={reportScope.current}
        />
      </div>

      <div className="card-surface overflow-hidden">
        <div className="flex items-end justify-between gap-3 p-5 pb-3">
          <h2 className="text-sm font-semibold text-foreground">Profit Summary</h2>
          <p className="text-xs text-muted-foreground">
            {unitText} · {plural(fyPeriods.length, "{n} month to date", "{n} months to date")}
          </p>
        </div>
        <div tabIndex={0} role="region" aria-label="Profit Summary" className="scrollbar-thin overflow-x-auto px-5 pb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <table
            className="tbl-report tbl-frozen"
            style={{ minWidth: `${240 + columns.length * 110}px` }}
          >
            <thead>
              <tr>
                <th>Particulars</th>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowSkeleton.map((r, ri) => (
                <tr key={r.key} className={r.strong ? "row-sub" : ""}>
                  <td>{r.label}</td>
                  {columns.map((c) => {
                    const cell = c.rows[ri];
                    const base = c.rows[0].value; // sales, for % of revenue
                    return (
                      <td key={c.key} className={`nums${cell.value < 0 ? " neg" : ""}`}>
                        {fmtCompact(cell.value)}
                        {base ? <span className="pnl-pct">{fmtPct(cell.value / base)}</span> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="flex items-end justify-between gap-3 p-5 pb-3">
          <h2 className="text-sm font-semibold text-foreground">Balance Sheet Summary</h2>
          <p className="text-xs text-muted-foreground">{unitText} · closing position</p>
        </div>
        <div tabIndex={0} role="region" aria-label="Balance Sheet Summary" className="scrollbar-thin overflow-x-auto px-5 pb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <table
            className="tbl-report tbl-frozen"
            style={{ minWidth: `${240 + bsColumns.length * 130}px` }}
          >
            <thead>
              <tr>
                <th>Particulars</th>
                {bsColumns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bsRows.map((r) => (
                <tr key={r.key} className={r.key === "cccDays" ? "row-sub" : ""}>
                  <td>{r.label}</td>
                  {bsColumns.map((c) => {
                    const v = r.get(c);
                    return (
                      <td key={c.key} className={`nums${v !== null && v < 0 ? " neg" : ""}`}>
                        {v === null ? "—" : r.days ? `${v}d` : fmtCompact(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Full line-by-line detail is under{" "}
        <Link href={scoped("/pnl")} className="font-medium text-primary underline">
          P&amp;L Detail
        </Link>
        .
      </p>
    </section>
  );
}
