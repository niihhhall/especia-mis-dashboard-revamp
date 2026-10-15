import Link from "next/link";

import { AgeingTable } from "@/components/dashboard/ageing-table";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { AgeingView } from "@/lib/data/ageing";

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label uppercase text-text-secondary">{label}</p>
      <p className="num text-card-title font-semibold text-text-primary">{children}</p>
    </div>
  );
}

/**
 * Shared body of the Debtors and Creditors pages: the reconciliation strip
 * (ageing total, trial balance, variance) and the party table. Props only.
 */
export function AgeingReport({ view }: { view: AgeingView }) {
  const { noun, unitText, periodLabel, summary, rows, tabs, uploadHref } = view;

  if (!periodLabel) {
    return (
      <section>
        <PageHeader title={noun} filters={<PeriodSelector />} />
        <EmptyState title="No reporting period yet." />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={noun}
        subtitle={
          <>
            {noun} ageing ({unitText}): outstanding as on {periodLabel}
          </>
        }
        filters={<PeriodSelector />}
      />

      <ReportTabs tabs={tabs} />

      {rows.length === 0 || !summary ? (
        <EmptyState
          title={`No ${noun.toLowerCase()} ageing uploaded for ${periodLabel}.`}
          description={
            <>
              <Link href={uploadHref} className="font-medium text-text-primary underline underline-offset-2">
                Upload one
              </Link>{" "}
              to populate this report.
            </>
          }
        />
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Figure label="Ageing total">{summary.ageingTotal}</Figure>
              <Figure label="Trial balance">{summary.ledger}</Figure>
              <Figure label="Variance">
                {summary.variance}
                {summary.variancePct !== null && (
                  <span className="ms-2 text-body font-normal text-text-secondary">{summary.variancePct}</span>
                )}
                {/* Colour alone can't say whether it reconciles, so the word stays. */}
                <span className="ms-2 text-body font-normal text-text-secondary">
                  {summary.matches ? "matches" : "mismatch"}
                </span>
              </Figure>
              <p className="max-w-md text-body text-pretty text-text-secondary">
                KPIs and the Cash Conversion Cycle use the trial-balance figure. A gap here means the
                ageing run and the ledger disagree and one of them needs investigating.
              </p>
            </div>
          </Card>
          <Card flush>
            <AgeingTable rows={rows} noun={noun} />
          </Card>
        </>
      )}
    </section>
  );
}
