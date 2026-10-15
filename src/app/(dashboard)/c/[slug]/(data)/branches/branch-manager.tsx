"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/shared/card";
import { CloneBanner } from "@/components/shared/clone-banner";
import type { CompanySummary } from "@/lib/data/company-context";
import type { Branch, BranchGroup, ReportKind, ScopeDepth } from "@/lib/data/mis";

import { cloneBranchesFrom } from "./actions";
import { BranchEditor } from "./branch-editor";
import { HEAD } from "./branch-ui";
import { GroupEditor } from "./group-editor";
import { NewBranchRow } from "./new-branch-row";
import { NewGroupRow } from "./new-group-row";
import { REPORTS, ReportScopeRow } from "./report-scope-row";

const sr = (text: string) => <span className="sr-only">{text}</span>;

/** One section card: title, its existing explanation, then the table in a labelled scroll region. */
function Section({ title, about, label, heads, footer, children }: {
  title: string;
  about: ReactNode;
  label: string;
  heads: ReactNode[];
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card flush title={title} subtitle={about} footer={footer} className="gap-4">
      <div tabIndex={0} role="region" aria-label={label} className="scrollbar-thin relative overflow-x-auto border-t border-border focus-visible:-outline-offset-2">
        <table className="w-full text-body text-text-primary">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              {heads.map((h, i) => (
                <th key={i} className={HEAD}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function BranchManager({
  slug,
  branches,
  groups,
  scopeConfig,
  cloneSources,
}: {
  slug: string;
  branches: Branch[];
  groups: BranchGroup[];
  scopeConfig: Record<ReportKind, ScopeDepth>;
  cloneSources: CompanySummary[];
}) {
  const activeBranches = branches.filter((b) => !b.archivedAt);

  return (
    <div className="space-y-6">
      {branches.length === 0 && <CloneBanner variant="branches" slug={slug} cloneSources={cloneSources} onClone={cloneBranchesFrom} />}

      <Section
        title="Channel groups"
        about={"Optional: a mid-level rollup for branches (e.g. Retail vs Wholesale). Leave empty if this company just needs individual branches, no grouping."}
        label="Channel groups"
        heads={[sr("Order"), "Key", "Label", sr("Actions")]}
      >
        {groups.map((g, i) => (
          <GroupEditor key={g.id} group={g} slug={slug} isFirst={i === 0} isLast={i === groups.length - 1} />
        ))}
        <NewGroupRow slug={slug} />
      </Section>

      <Section
        title="Branches"
        about={"One row per Tally branch column: label must match exactly what Tally shows, so re-uploads match automatically."}
        label="Branches"
        heads={[sr("Order"), "Key", "Label", "Group", sr("Actions")]}
      >
        {branches.map((b, i) => (
          <BranchEditor key={b.id} branch={b} groups={groups} slug={slug} isFirst={i === 0} isLast={i === branches.length - 1} />
        ))}
        <NewBranchRow groups={groups} slug={slug} />
      </Section>

      <Section
        title="Report scope"
        about={
          <>
            How far each report&rsquo;s branch selector and Excel export can split this company&rsquo;s figures: the whole
            company only, also by channel group, or down to single branches. Every report starts at Consolidated only.
          </>
        }
        label="Report scope"
        heads={["Report", sr("About"), "Scope depth", sr("Status")]}
        footer={
          activeBranches.length === 0 ? (
            <>Add at least one branch above to change these: there&rsquo;s nothing to scope to yet.</>
          ) : undefined
        }
      >
        {REPORTS.map((r) => (
          <ReportScopeRow
            key={r.key}
            report={r.key}
            label={r.label}
            hint={r.hint}
            depth={scopeConfig[r.key]}
            disabled={activeBranches.length === 0}
            slug={slug}
          />
        ))}
      </Section>
    </div>
  );
}
