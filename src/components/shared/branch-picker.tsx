"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SegmentedControl } from "@/components/shared/segmented-control";
import { BRANCH_SCOPE_COOKIE } from "@/lib/branch-scope-cookie";

export interface BranchOption {
  id: string;
  label: string;
}

/**
 * Branch picker for Master Data: mirrors `PeriodPicker` exactly (same
 * segmented layout, same "writes a cookie, refreshes" mechanism). Only
 * rendered when a company has 2+ active branches (`master-data/page.tsx`
 * decides this), so a single-branch or legacy company never mounts it.
 *
 * Editing only ever targets one real `master_tb` row, and every row belongs
 * to exactly one branch (there is no "Consolidated" row to edit), so unlike
 * the report pages' scope selector this picker offers branches only.
 *
 * Writes the SAME `mis_branch_scope` cookie the report pages' selector uses,
 * so the choice follows the user across screens.
 */
export function BranchPicker({ branches, current }: { branches: BranchOption[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (branches.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-label text-text-secondary">Branch</span>
      <SegmentedControl
        label="Branch"
        pending={pending}
        value={current}
        options={branches.map((b) => ({ value: b.id, label: b.label }))}
        onChange={(id) => {
          start(() => {
            document.cookie = `${BRANCH_SCOPE_COOKIE}=branch:${id}; path=/; max-age=31536000`;
            router.refresh();
          });
        }}
      />
    </div>
  );
}
