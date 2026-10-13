"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { BRANCH_SCOPE_COOKIE } from "@/lib/branch-scope-cookie";

export interface BranchOption {
  id: string;
  label: string;
}

/**
 * Branch picker for Master Data — mirrors `PeriodPicker` exactly (same
 * pill layout, same "writes a cookie, refreshes" mechanism). Only rendered
 * when a company has 2+ active branches (`master-data/page.tsx` decides
 * this) — a single-branch/legacy company never mounts it, so its Master
 * Data screen is unchanged.
 *
 * Editing only ever targets one real `master_tb` row, and every row
 * belongs to exactly one branch — there's no "Consolidated" row to edit —
 * so unlike the report pages' scope selector (Phase 4), this picker offers
 * branches only, no Consolidated/Group option.
 *
 * Writes the SAME `mis_branch_scope` cookie the report pages' selector
 * will use, so the choice follows the user across screens — the same
 * relationship `PeriodPicker` already has with the header's period
 * dropdown.
 */
export function BranchPicker({ branches, current }: { branches: BranchOption[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (branches.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 print:hidden ${pending ? "opacity-60" : ""}`}
      role="group"
      aria-label="Branch"
    >
      <span className="text-overline font-semibold uppercase text-muted-foreground">
        Branch
      </span>
      {branches.map((b) => {
        const active = b.id === current;
        return (
          <button
            key={b.id}
            type="button"
            // aria-disabled keeps focus on the button during the refresh.
            aria-disabled={pending || undefined}
            aria-pressed={active}
            onClick={() => {
              if (active || pending) return;
              start(() => {
                document.cookie = `${BRANCH_SCOPE_COOKIE}=branch:${b.id}; path=/; max-age=31536000`;
                router.refresh();
              });
            }}
            className={`h-8 rounded-lg px-3 text-ui font-semibold transition-colors ${
              active
                ? "brand-grad text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}
