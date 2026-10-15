"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { SegmentedControl } from "@/components/shared/segmented-control";
import { BRANCH_SCOPE_COOKIE } from "@/lib/branch-scope-cookie";

export interface BranchScopeOption {
  id: string;
  label: string;
  /** Branches only: the channel group this branch belongs to, if any. */
  groupId?: string | null;
}

/**
 * Per-REPORT scope selector, deliberately NOT rendered once in the shared
 * header the way `PeriodSelector` is. Each of the 5 report pages has its
 * own `report_scope_config` depth (Book to Bank might be Consolidated-only
 * while P&L allows full branch drill-down on the same company), so a single
 * shared selector would either show options that silently do nothing on
 * some pages, or hide options a deeper page actually supports. Rendering one
 * instance per page, gated by THAT page's own `depth`, means the selector
 * only ever offers choices that page honors, and disappears entirely
 * (returns null) when there's nothing beyond Consolidated to pick.
 *
 * Writes the SAME `mis_branch_scope` cookie `BranchPicker` (Master Data)
 * uses, so a choice made on one report page is remembered as the default
 * for a plain, query-less page load. On a page whose channel tabs put
 * scope in the URL (`withChannelTabs`, `report-tabs.ts`) the cookie alone
 * isn't enough: a `?scope=` already on the URL would keep overriding
 * whatever this selector just picked, so a change here also pushes the URL
 * (`router.push`), keeping the two in agreement.
 */
export function BranchScopeSelector({
  branches,
  groups,
  depth,
  current,
}: {
  branches: BranchScopeOption[];
  groups: BranchScopeOption[];
  depth: "consolidated" | "group" | "branch";
  current: string; // "consolidated" | "branch:<id>" | "group:<id>"
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  // Channel groups are already report tabs ("B2C P&L", "B2B P&L"), so they
  // are NOT choices here. The options follow whichever channel the CA is in:
  // on a channel tab (or a branch inside one) only that channel's own
  // branches are listed; on the company-wide view every branch is. A
  // 'group'-depth report has nothing left to pick (the tabs ARE its channel
  // choice), so nothing renders.
  const hasExtra = depth === "branch" && branches.length > 0;
  if (!hasExtra) return null;

  // Which channel's branches to list. On a channel tab it's that channel; once
  // a branch is picked the scope is `branch:<id>`, so the channel it was
  // picked from rides along in `?ch=`, which keeps every sibling on screen so
  // the CA can hop between branches without deselecting first. A branch
  // picked company-wide has no `ch`, and keeps listing every branch.
  const chParam = searchParams.get("ch");
  const activeGroupId = current.startsWith("group:")
    ? current.slice(6)
    : current.startsWith("branch:") && chParam && groups.some((g) => g.id === chParam)
      ? chParam
      : null;
  const group = activeGroupId ? groups.find((g) => g.id === activeGroupId) : undefined;
  const listBranches = group ? branches.filter((b) => b.groupId === group.id) : branches;
  const consolidatedValue = group ? `group:${group.id}` : "consolidated";
  const labelOf = shortLabels(listBranches.map((b) => b.label));

  const go = (value: string) => {
    rememberScope(value);
    const ch = group && value.startsWith("branch:") ? `&ch=${group.id}` : "";
    // A quarter folding picked on the page rides along, so changing branch doesn't unfold it.
    const q = searchParams.get("q");
    const qs = q ? `q=${encodeURIComponent(q)}` : "";
    const href =
      value === "consolidated"
        ? `${pathname}${qs ? `?${qs}` : ""}`
        : `${pathname}?scope=${value}${ch}${qs ? `&${qs}` : ""}`;
    start(() => router.push(href));
  };

  return (
    <SegmentedControl
      label="Branch scope"
      pending={pending}
      // Clicking the active branch again steps back out to the whole channel
      // (or company): the options are a toggle, not a one-way door.
      allowEmpty
      value={current.startsWith("branch:") ? current : ""}
      options={listBranches.map((b, i) => ({ value: `branch:${b.id}`, label: labelOf[i], title: b.label }))}
      onChange={(value) => go(value === "" ? consolidatedValue : value)}
    />
  );
}

function rememberScope(value: string): void {
  document.cookie = `${BRANCH_SCOPE_COOKIE}=${value}; path=/; max-age=31536000`;
}

/**
 * Branch names usually share a company prefix ("ROYAL ENTERPRISE (PUNE)",
 * "ROYAL ENTERPRISE (SURAT)") that would make every option identical for its
 * first half. Strips the longest shared leading words so the options stay
 * short; the full name stays in each option's tooltip.
 */
function shortLabels(labels: string[]): string[] {
  if (labels.length < 2) return labels;
  const words = labels.map((l) => l.split(" "));
  let n = 0;
  while (words.every((w) => w.length > n + 1 && w[n] === words[0][n])) n += 1;
  return n === 0 ? labels : words.map((w) => w.slice(n).join(" "));
}
