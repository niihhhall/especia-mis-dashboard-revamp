import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { activeCompanyId } from "@/lib/data/company-context";
import {
  getBranches,
  getMasterEdits,
  getMasterRows,
  getPeriods,
  getSelectedBranchScope,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { scopedLink } from "@/lib/data/scoped-link";
import type { MasterRowScope } from "@/lib/mis/types";

import { EditHistory } from "./edit-history";
import { MasterDataHeader } from "./master-data-header";
import { MasterTable } from "./master-table";

export const metadata = { title: "Master data" };

export default async function MasterDataPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = (await activeCompanyId(slug)) ?? undefined;
  const [period, periods, branches] = await Promise.all([
    getSelectedPeriod(companyId),
    getPeriods(companyId),
    getBranches(companyId),
  ]);
  const activeBranches = branches.filter((b) => !b.archivedAt);

  // Editing only ever targets one real master_tb row, and every row
  // belongs to exactly one branch (or none, for a legacy single-branch
  // period): there's no "Consolidated" row to edit. So a multi-branch
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
    <section className="space-y-6">
      <MasterDataHeader
        periodLabel={period?.label ?? null}
        periods={periods.map((p) => ({ id: p.id, label: p.label }))}
        periodId={period?.id ?? ""}
        branches={activeBranches.map((b) => ({ id: b.id, label: b.label }))}
        branchId={branchId ?? ""}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No master data yet."
          description={
            <>
              <Link href={scoped("/upload")} className="font-medium text-text-primary underline underline-offset-2">
                Upload a trial balance
              </Link>{" "}
              to build it.
            </>
          }
        />
      ) : (
        <MasterTable rows={rows} edits={edits} slug={slug} branchId={branchId} />
      )}

      <EditHistory edits={edits} periodLabel={period?.label} />
    </section>
  );
}
