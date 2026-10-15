import Link from "next/link";

import { BranchPicker } from "@/components/shared/branch-picker";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PeriodSelector } from "@/components/layout/period-selector";
import { PeriodPicker } from "@/components/shared/period-picker";
import {
  getBranches,
  getManualInputs,
  getMisSegments,
  getMisTemplate,
  getPeriods,
  getSelectedBranchScope,
  getSelectedPeriod,
} from "@/lib/data/mis";
import { activeCompanyId } from "@/lib/data/company-context";
import type { MasterRowScope } from "@/lib/mis/types";

import { InputsForm } from "./inputs-form";
import { scopedLink } from "@/lib/data/scoped-link";

export const metadata = { title: "Adjustments" };

export default async function InputsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  const companyId = await activeCompanyId(slug);
  const [period, periods, template, segments, branches] = await Promise.all([
    getSelectedPeriod(companyId ?? undefined),
    getPeriods(companyId ?? undefined),
    getMisTemplate(companyId ?? undefined),
    getMisSegments(companyId ?? undefined),
    getBranches(companyId ?? undefined),
  ]);
  const activeBranches = branches.filter((b) => !b.archivedAt);

  // Same reasoning as Master Data: an adjustment always belongs to exactly
  // one real manual_inputs row, and for a multi-branch company that row is
  // always tied to one specific branch: there's no "Consolidated" row to
  // edit directly (Consolidated is the SUM of every branch's own entered
  // figure, computed on read). A "consolidated"/"group"/stale cookie value
  // falls back to the first branch, same spirit as getSelectedPeriod's own
  // fallback to periods[0].
  let branchId: string | null = null;
  if (activeBranches.length > 0) {
    const selection = await getSelectedBranchScope(activeBranches, []);
    branchId =
      selection.kind === "branch" && activeBranches.some((b) => b.id === selection.branchId)
        ? selection.branchId
        : activeBranches[0].id;
  }
  const scope: MasterRowScope = branchId ? { kind: "branch", branchId } : { kind: "consolidated" };

  const initial = period ? await getManualInputs(period.id, scope) : {};

  return (
    <section className="space-y-6">
      {/* Adjustments are entered per month, closing stock especially, so the
          month being edited sits in the page header beside the title, not only
          in the shared period selector. */}
      <PageHeader
        title="Adjustments"
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

      {!period ? (
        <EmptyState
          title="No period yet."
          description={
            <>
              <Link href={scoped("/upload")} className="font-medium text-text-primary underline underline-offset-2">
                Upload a trial balance
              </Link>{" "}
              first.
            </>
          }
        />
      ) : (
        <InputsForm
          initial={initial}
          periodLabel={period.label}
          branchId={branchId}
          slug={slug}
          template={template}
          segments={segments}
        />
      )}
    </section>
  );
}
