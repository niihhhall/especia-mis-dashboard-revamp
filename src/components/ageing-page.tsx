import Link from "next/link";

import { AgeingTable } from "@/components/ageing-table";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { ReportTabs } from "@/components/layout/report-tabs";
import {
  getAgeing,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { fmtPct } from "@/lib/format";
import { getFmtCompact, getUnitCaption } from "@/lib/data/unit";
import { computeCcc } from "@/lib/mis/ccc";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";
import { activeCompanyId } from "@/lib/data/company-context";

/**
 * Shared body of the Debtors and Creditors pages.
 *
 * Both show a party-level ageing plus a reconciliation against the trial
 * balance. The ledger stays the authoritative figure for the KPIs and the CCC;
 * this surfaces the gap rather than silently preferring one source, because the
 * two genuinely disagree and a CA needs to see by how much.
 */
export async function AgeingPage({
  kind,
  slug,
}: {
  kind: "debtor" | "creditor";
  slug: string;
}) {
  const fmtCompact = await getFmtCompact();
  const unitText = await getUnitCaption();
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const noun = kind === "debtor" ? "Debtors" : "Creditors";
  const period = await getSelectedPeriod(companyId ?? undefined);

  if (!period) {
    return (
      <section className="space-y-4">
        <PageHeader title={noun} filters={<PeriodSelector />} />
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No reporting period yet.
        </div>
      </section>
    );
  }

  const [rows, master, manual, template, segments] = await Promise.all([
    getAgeing(period.id, kind),
    getMasterRows(period.id),
    getManualInputs(period.id),
    getMisTemplate(companyId ?? undefined),
    getMisSegments(companyId ?? undefined),
  ]);

  // Only the current period's own closing balances are needed here (not the
  // turnover ratios), which don't depend on the FY run — a single-month array
  // is enough.
  const ccc = computeCcc([{ master, manual }], template);
  // Creditors sit on the liability side in the ledger, so compare magnitudes.
  const ledger = Math.abs(kind === "debtor" ? ccc.closingDebtors : ccc.closingCreditors);
  const ageingTotal = rows.reduce((a, r) => a + r.total, 0);
  const variance = ageingTotal - ledger;
  const variancePct = ledger ? variance / ledger : null;

  return (
    <section className="space-y-5">
      <PageHeader
        title={noun}
        subtitle={
          <>
            {noun} ageing ({unitText}) — outstanding as on {period.label}
          </>
        }
        filters={<PeriodSelector />}
      />

      <ReportTabs tabs={await getReportTabs(companyId ?? undefined, segments.length > 0)} />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No {noun.toLowerCase()} ageing uploaded for {period.label}.{" "}
          <Link href={scoped("/upload")} className="font-medium text-primary underline">
            Upload one
          </Link>{" "}
          to populate this report.
        </div>
      ) : (
        <>
          <div className="card-surface flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
            <div>
              <p className="text-overline font-bold uppercase text-muted-foreground">
                Ageing total
              </p>
              <p className="nums mt-1 text-lg font-bold text-foreground">
                {fmtCompact(ageingTotal)}
              </p>
            </div>
            <div>
              <p className="text-overline font-bold uppercase text-muted-foreground">
                Trial balance
              </p>
              <p className="nums mt-1 text-lg font-bold text-foreground">{fmtCompact(ledger)}</p>
            </div>
            <div>
              <p className="text-overline font-bold uppercase text-muted-foreground">
                Variance
              </p>
              <p
                className={`nums mt-1 text-lg font-bold ${
                  Math.abs(variance) < 1 ? "text-success-text" : "text-danger"
                }`}
              >
                {fmtCompact(variance)}
                {variancePct !== null && (
                  <span className="ms-1.5 text-xs font-medium text-muted-foreground">
                    {fmtPct(variancePct)}
                  </span>
                )}
                {/* Colour alone can't say whether it reconciles (WCAG 1.4.1). */}
                <span className="ms-1.5 text-xs font-medium text-muted-foreground">
                  {Math.abs(variance) < 1 ? "matches" : "mismatch"}
                </span>
              </p>
            </div>
            <p className="max-w-md text-xs text-muted-foreground">
              KPIs and the Cash Conversion Cycle use the trial-balance figure. A gap here means the
              ageing run and the ledger disagree and one of them needs investigating.
            </p>
          </div>

          <AgeingTable rows={rows} noun={noun} />
        </>
      )}
    </section>
  );
}
