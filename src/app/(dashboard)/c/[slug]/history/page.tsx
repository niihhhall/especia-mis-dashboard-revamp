import Link from "next/link";

import { getSessionProfile } from "@/lib/auth/session";
import { getCompany, getPeriods, getManualInputs, getMasterRows, getMisTemplate } from "@/lib/data/mis";
import { getFmtCompact } from "@/lib/data/unit";
import { computePnl } from "@/lib/mis/pnl";
import { fyDisplay } from "@/lib/format";
import { PERIOD_STATUS_LABEL } from "@/lib/labels";
import { fyLabel } from "@/lib/mis/period";
import { scopedLink } from "@/lib/data/scoped-link";
import { activeCompanyId } from "@/lib/data/company-context";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

export const metadata = { title: "MIS History" };

/**
 * Every month published for this company, newest first — the client's record of
 * what they have been sent. RLS already filters this list, so a company user
 * never sees a month still in draft.
 */
export default async function HistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const fmtCompact = await getFmtCompact();
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const [profile, company, periods, template] = await Promise.all([
    getSessionProfile(),
    getCompany(companyId ?? undefined),
    getPeriods(companyId ?? undefined),
    getMisTemplate(companyId ?? undefined),
  ]);

  const isStaff = profile?.role !== "company";

  if (periods.length === 0) {
    return (
      <section className="space-y-4">
        <PageHeader title="MIS History" filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p>No reports published yet.</p>
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

  const rows = await Promise.all(
    periods.map(async (p) => {
      const [master, manual] = await Promise.all([getMasterRows(p.id), getManualInputs(p.id)]);
      const t = computePnl(master, manual, template).totals;
      return { period: p, revenue: t.revenue, grossProfit: t.grossProfit, ebt: t.ebt };
    }),
  );

  return (
    <section className="space-y-5">
      <PageHeader
        title="MIS History"
        subtitle={<>Every month published for {company?.name ?? "your company"}.</>}
        filters={<PeriodSelector />}
      />

      <div tabIndex={0} role="region" aria-label="MIS history" className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="tbl-report tbl-frozen min-w-[720px]">
          <thead>
            <tr>
              <th>Period</th>
              <th>Financial year</th>
              <th>Revenue</th>
              <th>Gross Profit</th>
              <th>Net Profit (EBT)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ period, revenue, grossProfit, ebt }) => (
              <tr key={period.id}>
                <td>
                  <Link href={scoped("/dashboard")} className="font-medium text-primary underline">
                    {period.label}
                  </Link>
                </td>
                <td className="text-muted-foreground">
                  {fyDisplay(fyLabel(period.month, company?.fy_start_month ?? 4))}
                </td>
                <td className="nums">{fmtCompact(revenue)}</td>
                <td className={`nums${grossProfit < 0 ? " neg" : ""}`}>{fmtCompact(grossProfit)}</td>
                <td className={`nums${ebt < 0 ? " neg" : ""}`}>{fmtCompact(ebt)}</td>
                <td className="text-muted-foreground">{PERIOD_STATUS_LABEL[period.status] ?? period.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Switch the month in the header to open any of these in the dashboard.
      </p>
    </section>
  );
}
