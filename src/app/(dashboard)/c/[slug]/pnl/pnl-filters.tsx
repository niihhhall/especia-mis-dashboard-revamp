import { PeriodSelector } from "@/components/layout/period-selector";
import { BranchScopeSelector } from "@/components/shared/branch-scope-selector";
import { QuarterFilter } from "@/components/shared/quarter-filter";
import { SegmentedLinks } from "@/components/shared/segmented-links";
import type { Quarter } from "@/lib/mis/quarters";

type ScopeBranch = { id: string; label: string; groupId: string | null };

/** The P&L header filters: period, quarters, the Monthly or Branch-wise view and the branch scope. Props only. */
export function PnlFilters({
  showQuarters,
  selectedQuarters,
  availableQuarters,
  fyStartNo,
  quarterHref,
  canBranchWise,
  branchWiseActive,
  monthlyHref,
  branchWiseHref,
  branches,
  groups,
  depth,
  current,
}: {
  showQuarters: boolean;
  selectedQuarters: Quarter[];
  availableQuarters: Set<Quarter>;
  fyStartNo: number;
  quarterHref: (qs: Quarter[]) => string;
  canBranchWise: boolean;
  branchWiseActive: boolean;
  monthlyHref: string;
  branchWiseHref: string;
  branches: ScopeBranch[];
  groups: { id: string; label: string }[];
  depth: Parameters<typeof BranchScopeSelector>[0]["depth"];
  current: string;
}) {
  return (
    <>
      <PeriodSelector />
      {showQuarters && (
        <QuarterFilter
          selected={selectedQuarters}
          available={availableQuarters}
          fyStartMonthNo={fyStartNo}
          buildHref={quarterHref}
        />
      )}
      {canBranchWise && (
        <SegmentedLinks
          label="Columns"
          options={[
            { href: monthlyHref, label: "Monthly", active: !branchWiseActive },
            { href: branchWiseHref, label: "Branch-wise", active: branchWiseActive },
          ]}
        />
      )}
      <BranchScopeSelector branches={branches} groups={groups} depth={depth} current={current} />
    </>
  );
}
