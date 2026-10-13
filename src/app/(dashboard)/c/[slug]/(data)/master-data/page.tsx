import Link from "next/link";

import { BranchPicker } from "@/components/branch-picker";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { PeriodPicker } from "@/components/period-picker";
import {
  getBranches,
  getMasterEdits,
  getMasterRows,
  getPeriods,
  getSelectedBranchScope,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { activeCompanyId } from "@/lib/data/company-context";
import { fmtAmount } from "@/lib/format";
import type { MasterRowScope } from "@/lib/mis/types";

import { MasterTable } from "./master-table";
import { scopedLink } from "@/lib/data/scoped-link";

export const metadata = { title: "Master Data" };

const FIELD_LABEL: Record<string, string> = {
  opening: "Opening",
  debit: "Debit",
  credit: "Credit",
  closing: "Closing",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MasterDataPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const [period, periods, branches] = await Promise.all([
    getSelectedPeriod(companyId ?? undefined),
    getPeriods(companyId ?? undefined),
    getBranches(companyId ?? undefined),
  ]);
  const activeBranches = branches.filter((b) => !b.archivedAt);

  // Editing only ever targets one real master_tb row, and every row
  // belongs to exactly one branch (or none, for a legacy single-branch
  // period) — there's no "Consolidated" row to edit. So a multi-branch
  // company always needs one branch picked here: a "consolidated"/"group"
  // cookie value (left over from viewing a report page) or a stale/invalid
  // one falls back to the first branch, same spirit as getSelectedPeriod's
  // own fallback to periods[0].
  let branchId: string | null = null;
  if (activeBranches.length > 0) {
    const selection = await getSelectedBranchScope(activeBranches, []);
    branchId =
      selection.kind === "branch" && activeBranches.some((b) => b.id === selection.branchId)
        ? selection.branchId
        : activeBranches[0].id;
  }
  const scope: MasterRowScope = branchId ? { kind: "branch", branchId } : { kind: "consolidated" };

  const [rows, edits] = period
    ? await Promise.all([getMasterRows(period.id, scope), getMasterEdits(period.id)])
    : [[], []];

  return (
    <section>
      {/* An edit here rewrites one month's accounts, so which month is being
          edited sits in the page header too, not only in the shared period
          selector. */}
      <PageHeader
        title="Master Data"
        subtitle={period ? `Normalised trial balance — ${period.label}` : "No data yet"}
        filters={
          <>
            <PeriodSelector />
            <PeriodPicker
              periods={periods.map((p) => ({ id: p.id, label: p.label }))}
              current={period?.id ?? ""}
              label="Editing"
            />
            {activeBranches.length > 0 && (
              <BranchPicker
                branches={activeBranches.map((b) => ({ id: b.id, label: b.label }))}
                current={branchId ?? ""}
              />
            )}
          </>
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No Master Data yet.{" "}
          <Link href={scoped("/upload")} className="font-medium text-primary underline">
            Upload a Trial Balance
          </Link>{" "}
          to build it.
        </div>
      ) : (
        <MasterTable rows={rows} edits={edits} slug={slug} branchId={branchId} />
      )}

      {edits.length > 0 && (
        <details className="mt-6 rounded-xl border border-border bg-card p-4" open>
          <summary className="cursor-pointer text-sm font-semibold">
            Edit history ({edits.length})
          </summary>
          <p className="mt-1 max-w-prose break-words text-pretty text-xs text-muted-foreground">
            Manual corrections to {period?.label}. Re-uploading this month replaces them with the
            Tally values — these entries remain here as the record.
          </p>
          <div className="scrollbar-thin mt-3 max-h-72 overflow-y-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
                  <th className="px-2 py-1.5 font-semibold">When</th>
                  <th className="px-2 py-1.5 font-semibold">Who</th>
                  <th className="px-2 py-1.5 font-semibold">Ledger</th>
                  <th className="px-2 py-1.5 font-semibold">Field</th>
                  <th className="px-2 py-1.5 text-end font-semibold">From</th>
                  <th className="px-2 py-1.5 text-end font-semibold">To</th>
                </tr>
              </thead>
              <tbody>
                {edits.map((e, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1.5 text-muted-foreground">{when(e.edited_at)}</td>
                    <td className="px-2 py-1.5">{e.editor ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      {e.particulars}
                      {e.branchLabel && (
                        <span className="ms-1.5 text-xs text-muted-foreground">· {e.branchLabel}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {FIELD_LABEL[e.field] ?? e.field}
                    </td>
                    <td className="nums px-2 py-1.5 text-end text-muted-foreground">
                      {fmtAmount(e.old_value)}
                    </td>
                    <td className="nums px-2 py-1.5 text-end font-medium">
                      {fmtAmount(e.new_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
