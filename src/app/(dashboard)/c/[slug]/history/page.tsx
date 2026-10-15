import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { getSessionProfile } from "@/lib/auth/session";
import { activeCompanyId } from "@/lib/data/company-context";
import { getCompany, getManualInputs, getMasterRows, getMisTemplate, getPeriods } from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtCompact } from "@/lib/data/unit";
import { fyDisplay, negParens } from "@/lib/format";
import { PERIOD_STATUS_LABEL } from "@/lib/labels";
import { fyLabel } from "@/lib/mis/period";
import { computePnl } from "@/lib/mis/pnl";

export const metadata = { title: "MIS history" };

const LINK = "font-medium text-text-primary underline underline-offset-2";
const TH = "sticky top-0 bg-surface-raised px-3 py-2 text-label font-medium text-text-secondary first:ps-5 last:pe-5";
const TD = "px-3 py-2 first:ps-5 last:pe-5";
const HEADS: [string, boolean][] = [
  ["Period", false],
  ["Financial year", false],
  ["Revenue", true],
  ["Gross profit", true],
  ["Net profit (EBT)", true],
  ["Status", false],
];

/**
 * Every month published for this company, newest first: the client's record of
 * what they have been sent. RLS already filters this list, so a company user
 * never sees a month still in draft.
 */
export default async function HistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const fmtCompact = await getFmtCompact();
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const [profile, company, periods, template] = await Promise.all([
    getSessionProfile(),
    getCompany(companyId),
    getPeriods(companyId),
    getMisTemplate(companyId),
  ]);
  const isStaff = profile?.role !== "company";

  if (periods.length === 0) {
    return (
      <section className="space-y-6">
        <PageHeader title="MIS history" filters={<PeriodSelector />} />
        <EmptyState
          title="No reports published yet."
          description={
            isStaff ? (
              <>
                <Link href={scoped("/upload")} className={LINK}>
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

  const rows = await Promise.all(
    periods.map(async (p) => {
      const [master, manual] = await Promise.all([getMasterRows(p.id), getManualInputs(p.id)]);
      const t = computePnl(master, manual, template).totals;
      return { period: p, revenue: t.revenue, grossProfit: t.grossProfit, ebt: t.ebt };
    }),
  );
  const show = (v: number) => negParens(fmtCompact(v));

  return (
    <section className="space-y-6">
      <PageHeader
        title="MIS history"
        subtitle={<>Every month published for {company?.name ?? "your company"}.</>}
        filters={<PeriodSelector />}
      />

      <Card flush footer="Switch the month in the header to open any of these in the dashboard.">
        <div tabIndex={0} role="region" aria-label="MIS history" className="scrollbar-thin relative overflow-x-auto focus-visible:-outline-offset-2">
          <table className="w-full min-w-max border-collapse text-body text-text-primary">
            <thead>
              <tr>
                {HEADS.map(([h, num]) => (
                  <th key={h} scope="col" className={`${TH} ${num ? "text-end" : "text-start"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ period, revenue, grossProfit, ebt }) => (
                <tr key={period.id} className="border-b border-border transition-colors hover:bg-surface-raised">
                  <th scope="row" className={`${TD} text-start font-medium`}>
                    <Link href={scoped("/dashboard")} className={LINK}>
                      {period.label}
                    </Link>
                  </th>
                  <td className={`${TD} text-text-secondary`}>{fyDisplay(fyLabel(period.month, company?.fy_start_month ?? 4))}</td>
                  <td className={`${TD} num`}>{show(revenue)}</td>
                  <td className={`${TD} num`}>{show(grossProfit)}</td>
                  <td className={`${TD} num`}>{show(ebt)}</td>
                  <td className={`${TD} text-text-secondary`}>{PERIOD_STATUS_LABEL[period.status] ?? period.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
