import "server-only";

import { activeCompanyId } from "@/lib/data/company-context";
import {
  getAgeing,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getSelectedPeriod,
  type AgeingEntry,
} from "@/lib/data/mis";
import { getReportTabs } from "@/lib/data/report-tabs";
import { scopedLink } from "@/lib/data/scoped-link";
import { getFmtCompact, getUnitCaption } from "@/lib/data/unit";
import { fmtPct } from "@/lib/format";
import { computeCcc } from "@/lib/mis/ccc";
import type { ReportTab } from "@/types/report";

/** The ageing-vs-ledger reconciliation, already formatted for display. */
export interface AgeingSummary {
  ageingTotal: string;
  ledger: string;
  variance: string;
  variancePct: string | null;
  matches: boolean;
}

export interface AgeingView {
  noun: "Debtors" | "Creditors";
  unitText: string;
  uploadHref: string;
  /** Null when no period is published yet. */
  periodLabel: string | null;
  tabs: ReportTab[];
  rows: AgeingEntry[];
  summary: AgeingSummary | null;
}

/**
 * Everything the Debtors and Creditors pages show: the party-level ageing plus
 * a reconciliation against the trial balance. The ledger stays the
 * authoritative figure for the KPIs and the CCC; the summary surfaces the gap
 * rather than silently preferring one source, because the two genuinely
 * disagree and a CA needs to see by how much.
 */
export async function loadAgeingView(kind: "debtor" | "creditor", slug: string): Promise<AgeingView> {
  const fmt = await getFmtCompact();
  const unitText = await getUnitCaption();
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const noun: AgeingView["noun"] = kind === "debtor" ? "Debtors" : "Creditors";
  const period = await getSelectedPeriod(companyId);
  const base = { noun, unitText, uploadHref: scoped("/upload"), tabs: [] as ReportTab[], rows: [] as AgeingEntry[], summary: null };

  if (!period) return { ...base, periodLabel: null };

  const [rows, master, manual, template, segments] = await Promise.all([
    getAgeing(period.id, kind),
    getMasterRows(period.id),
    getManualInputs(period.id),
    getMisTemplate(companyId),
    getMisSegments(companyId),
  ]);
  const tabs = await getReportTabs(companyId, segments.length > 0);

  // Only the current period's own closing balances are needed here (not the
  // turnover ratios), which don't depend on the FY run, so a single-month array
  // is enough.
  const ccc = computeCcc([{ master, manual }], template);
  // Creditors sit on the liability side in the ledger, so compare magnitudes.
  const ledger = Math.abs(kind === "debtor" ? ccc.closingDebtors : ccc.closingCreditors);
  const ageingTotal = rows.reduce((a, r) => a + r.total, 0);
  const variance = ageingTotal - ledger;
  const summary: AgeingSummary = {
    ageingTotal: fmt(ageingTotal),
    ledger: fmt(ledger),
    variance: fmt(variance),
    variancePct: ledger ? fmtPct(variance / ledger) : null,
    matches: Math.abs(variance) < 1,
  };
  return { ...base, periodLabel: period.label, tabs, rows, summary };
}
