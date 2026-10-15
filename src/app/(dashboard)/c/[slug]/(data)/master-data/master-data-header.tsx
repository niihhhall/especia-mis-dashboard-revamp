import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { BranchPicker } from "@/components/shared/branch-picker";
import { PeriodPicker } from "@/components/shared/period-picker";

/**
 * An edit here rewrites one month's accounts, so which month is being edited
 * sits in the page header too, not only in the shared period selector.
 */
export function MasterDataHeader({
  periodLabel,
  periods,
  periodId,
  branches,
  branchId,
}: {
  periodLabel: string | null;
  periods: { id: string; label: string }[];
  periodId: string;
  branches: { id: string; label: string }[];
  branchId: string;
}) {
  return (
    <PageHeader
      title="Master data"
      subtitle={periodLabel ? `Normalised trial balance: ${periodLabel}` : "No data yet"}
      filters={
        <>
          <PeriodSelector />
          <PeriodPicker periods={periods} current={periodId} label="Editing" />
          {branches.length > 0 && <BranchPicker branches={branches} current={branchId} />}
        </>
      }
    />
  );
}
