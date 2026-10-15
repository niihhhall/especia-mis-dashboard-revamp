import "server-only";

import { plural } from "@/lib/format";

import { listCompanies } from "./company-context";
import {
  getManualInputs,
  getMasterRows,
  getPeriods,
  getLedgerMap,
  type Period,
} from "./mis";

export type IssueLevel = "blocker" | "warning";

export interface ReviewIssue {
  level: IssueLevel;
  label: string;
  detail: string;
  /** In-company path that fixes it, e.g. "/inputs". */
  fix: string;
}

export interface ReviewItem {
  companyId: string;
  slug: string;
  companyName: string;
  period: Period;
  issues: ReviewIssue[];
}

/** A trial balance row only balances when opening + debit − credit − closing is 0. */
const DIFF_TOLERANCE = 0.01;

/**
 * Everything across the caller's clients that wants a human look before the
 * month goes out.
 *
 * Deliberately wider than "months still in draft". Ingestion publishes on
 * upload, so a drafts-only queue would sit empty while a real problem, a month
 * with no closing stock, which drives COGS and therefore every profit line -
 * shipped to a client unnoticed. These are the checks that catch that.
 *
 * Only the current financial year's months are scanned. Older months are
 * closed business, and re-flagging them forever would bury the live ones.
 */
export async function getReviewQueue(): Promise<ReviewItem[]> {
  const companies = await listCompanies();
  const out: ReviewItem[] = [];

  for (const company of companies) {
    const periods = await getPeriods(company.id);
    if (periods.length === 0) continue;

    const ledgerMap = await getLedgerMap(company.id);
    const mapped = new Set(ledgerMap.map((m) => m.ledger.trim().toUpperCase()));

    // Newest six months, so the queue stays about live work.
    for (const period of periods.slice(0, 6)) {
      const [rows, manual] = await Promise.all([
        getMasterRows(period.id),
        getManualInputs(period.id),
      ]);
      const issues: ReviewIssue[] = [];

      if (period.status === "draft") {
        issues.push({
          level: "blocker",
          label: "Not published",
          detail: "The client cannot see this month until it is published.",
          fix: "/master-data",
        });
      }

      if (rows.length === 0) {
        issues.push({
          level: "blocker",
          label: "No trial balance",
          detail: "The period exists but no Tally trial balance has been ingested.",
          fix: "/upload",
        });
      } else {
        // Closing stock drives COGS, so a missing figure does not merely leave a
        // blank cell, it overstates cost of goods by the whole stock balance
        // and turns gross profit negative. This is the check that would have
        // caught Jun and Jul going out with zero stock.
        if (!manual.closingStock) {
          issues.push({
            level: "blocker",
            label: "No closing stock",
            detail: "COGS and every profit line below it are wrong without it.",
            fix: "/inputs",
          });
        }

        const unmapped = rows.filter(
          (r) => r.unmapped || !mapped.has(r.particulars.trim().toUpperCase()),
        );
        if (unmapped.length > 0) {
          issues.push({
            level: "warning",
            label: plural(unmapped.length, "1 unmapped ledger", "{n} unmapped ledgers"),
            detail: unmapped
              .slice(0, 3)
              .map((r) => r.particulars)
              .join(", "),
            fix: "/mapping",
          });
        }

        const offBy = rows.filter(
          (r) => Math.abs(r.opening + r.debit - r.credit - r.closing) > DIFF_TOLERANCE,
        );
        if (offBy.length > 0) {
          issues.push({
            level: "blocker",
            label: plural(offBy.length, "1 row out of balance", "{n} rows out of balance"),
            detail: "Opening + debit − credit does not equal closing.",
            fix: "/master-data",
          });
        }
      }

      if (issues.length > 0) {
        out.push({
          companyId: company.id,
          slug: company.slug,
          companyName: company.name,
          period,
          issues,
        });
      }
    }
  }

  // Blockers first, then newest month, so the queue reads top-down as a to-do.
  const weight = (i: ReviewItem) => (i.issues.some((x) => x.level === "blocker") ? 0 : 1);
  return out.sort(
    (a, b) => weight(a) - weight(b) || b.period.month.localeCompare(a.period.month),
  );
}
