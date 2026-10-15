import { StatementTable } from "@/components/dashboard/statement-table";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { activeCompanyId } from "@/lib/data/company-context";
import { getManualInputs, getMasterRows, getMisTemplate, getPeriods } from "@/lib/data/mis";
import { getFmtCompact } from "@/lib/data/unit";
import type { TemplateLine } from "@/lib/mis/catalog";
import { computePnl } from "@/lib/mis/pnl";

import { compareRows } from "./compare-rows";
import { MonthPicker } from "./month-picker";

export const metadata = { title: "Compare months" };

async function totalsFor(periodId: string, template: TemplateLine[]) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId), getManualInputs(periodId)]);
  return computePnl(rows, manual, template).totals;
}

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
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const periods = await getPeriods(companyId); // newest first

  if (periods.length < 2) {
    return (
      <section className="space-y-6">
        <PageHeader title="Compare months" filters={<PeriodSelector />} />
        <EmptyState title="At least two published months are needed to compare." />
      </section>
    );
  }

  // Default to the two most recent months.
  const left = periods.find((p) => p.id === b) ?? periods[1];
  const right = periods.find((p) => p.id === a) ?? periods[0];

  const template = await getMisTemplate(companyId);
  const [lt, rt] = await Promise.all([totalsFor(left.id, template), totalsFor(right.id, template)]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Compare months"
        subtitle={
          <>
            {left.label} versus {right.label}.
          </>
        }
        filters={
          <>
            <PeriodSelector />
            <MonthPicker periods={periods.map((p) => ({ id: p.id, label: p.label }))} left={left.id} right={right.id} />
          </>
        }
      />

      <Card flush>
        <StatementTable
          label="Month comparison"
          firstColumnLabel="Particulars"
          columns={[
            { key: "left", label: left.label },
            { key: "right", label: right.label },
            { key: "change", label: "Change" },
          ]}
          rows={compareRows(lt, rt, fmtCompact)}
          columnWidth="lg"
        />
      </Card>
    </section>
  );
}
