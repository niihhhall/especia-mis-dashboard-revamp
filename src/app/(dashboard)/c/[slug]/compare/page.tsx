import { Fragment } from "react";

import { getManualInputs, getMasterRows, getMisTemplate, getPeriods } from "@/lib/data/mis";
import { activeCompanyId } from "@/lib/data/company-context";
import { fmtPct } from "@/lib/format";
import { getFmtCompact } from "@/lib/data/unit";
import type { TemplateLine } from "@/lib/mis/catalog";
import { computePnl } from "@/lib/mis/pnl";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

import { MonthPicker } from "./month-picker";

export const metadata = { title: "Compare Months" };

async function totalsFor(periodId: string, template: TemplateLine[]) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId), getManualInputs(periodId)]);
  return computePnl(rows, manual, template).totals;
}

const LINES = [
  { key: "revenue", label: "Revenue", goodWhenUp: true },
  { key: "cogs", label: "COGS", goodWhenUp: false },
  { key: "grossProfit", label: "Gross Profit", goodWhenUp: true },
  { key: "indirectIncome", label: "Indirect Income", goodWhenUp: true },
  { key: "indirectExpense", label: "Indirect Expenses", goodWhenUp: false },
  { key: "ebitda", label: "EBITDA", goodWhenUp: true },
  { key: "ebt", label: "Net Profit (EBT)", goodWhenUp: true },
] as const;

/** Side-by-side comparison of any two published months. */
export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const fmtCompact = await getFmtCompact();
  const { slug } = await params;
  const { a, b } = await searchParams;
  const companyId = await activeCompanyId(slug);
  const periods = await getPeriods(companyId ?? undefined); // newest first

  if (periods.length < 2) {
    return (
      <section className="space-y-4">
        <PageHeader title="Compare Months" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          At least two published months are needed to compare.
        </div>
      </section>
    );
  }

  // Default to the two most recent months.
  const left = periods.find((p) => p.id === b) ?? periods[1];
  const right = periods.find((p) => p.id === a) ?? periods[0];

  const template = await getMisTemplate(companyId ?? undefined);
  const [lt, rt] = await Promise.all([totalsFor(left.id, template), totalsFor(right.id, template)]);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Compare Months"
        subtitle={
          <>
            {left.label} versus {right.label}.
          </>
        }
        filters={
          <>
            <PeriodSelector />
            <MonthPicker
              periods={periods.map((p) => ({ id: p.id, label: p.label }))}
              left={left.id}
              right={right.id}
            />
          </>
        }
      />

      <div tabIndex={0} role="region" aria-label="Month comparison" className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="tbl-report tbl-frozen min-w-[620px]">
          <thead>
            <tr>
              <th>Particulars</th>
              <th>{left.label}</th>
              <th>{right.label}</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {LINES.map((l) => {
              const lv = lt[l.key];
              const rv = rt[l.key];
              const diff = rv - lv;
              // A zero base makes percentage change meaningless.
              const pct = lv === 0 ? null : diff / Math.abs(lv);
              const good = diff === 0 ? null : diff > 0 === l.goodWhenUp;
              const cls = good === null ? "" : good ? " pos" : " neg";
              return (
                <Fragment key={l.key}>
                  <tr className={l.key === "ebt" ? "row-tot" : ""}>
                    <td>{l.label}</td>
                    <td className="nums">{fmtCompact(lv)}</td>
                    <td className="nums">{fmtCompact(rv)}</td>
                    <td className={`nums${l.key === "ebt" ? "" : cls}`}>
                      {fmtCompact(diff)}
                      {(pct !== null || good !== null) && (
                        <span className="pnl-pct">
                          {pct !== null && fmtPct(pct)}
                          {/* Colour alone can't say good or bad (WCAG 1.4.1). */}
                          {good !== null && `${pct !== null ? " · " : ""}${good ? "favourable" : "adverse"}`}
                        </span>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
