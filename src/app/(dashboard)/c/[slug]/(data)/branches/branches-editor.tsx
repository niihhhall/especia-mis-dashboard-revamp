"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActionStatus } from "@/components/action-status";
import type { CompanySummary } from "@/lib/data/company-context";
import type { Branch, BranchGroup, ReportKind, ScopeDepth } from "@/lib/data/mis";
import { fieldText, focusRing } from "@/lib/ui-classes";

import {
  archiveBranch,
  cloneBranchesFrom,
  deleteBranch,
  deleteBranchGroup,
  moveBranch,
  moveBranchGroup,
  saveBranch,
  saveBranchGroup,
  saveReportScopeDepth,
  unarchiveBranch,
  type BranchActionState,
} from "./actions";

const field = `w-full rounded-md border border-border bg-card px-2 py-1 ${fieldText} ${focusRing}`;
const btn =
  "inline-flex h-7 items-center rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40";

const REPORTS: { key: ReportKind; label: string; hint: string }[] = [
  { key: "pnl", label: "P&L", hint: "Can split down to single branches" },
  { key: "book_to_bank", label: "Book to Bank", hint: "Usually read for the whole company" },
  { key: "ccc", label: "Cash Conversion", hint: "Usually split no further than channel groups" },
  { key: "segment", label: "Segment P&L", hint: "Independent of branch — a company's own revenue-line split" },
];

const DEPTH_OPTIONS: { value: ScopeDepth; label: string }[] = [
  { value: "consolidated", label: "Consolidated only" },
  { value: "group", label: "Consolidated + Groups" },
  { value: "branch", label: "Consolidated + Groups + Branches" },
];

function StatusText({ status }: { status: BranchActionState | null }) {
  return <ActionStatus state={status} className="text-xs" />;
}

// --------------------------------------------------------------- Channel Groups

function GroupEditor({
  group,
  slug,
  isFirst,
  isLast,
}: {
  group: BranchGroup;
  slug: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(group.label);
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  const dirty = label !== group.label;

  function save() {
    const fd = new FormData();
    fd.set("id", group.id);
    fd.set("key", group.key);
    fd.set("label", label.trim());
    fd.set("sortOrder", String(group.sortOrder));
    start(async () => {
      const r = await saveBranchGroup(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  function move(direction: "up" | "down") {
    start(async () => {
      // A refusal (e.g. demo mode) must say so, or the arrow looks broken.
      const r = await moveBranchGroup(group.id, direction, slug);
      if (!r.ok) {
        setStatus(r);
        return;
      }
      router.refresh();
    });
  }
  function remove() {
    start(async () => {
      const r = await deleteBranchGroup(group.id, slug);
      if (!r.ok) {
        setStatus(r);
        setArmed(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className="border-b border-border/60 last:border-0 align-top">
      <td className="whitespace-nowrap px-2 py-1.5">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => move("up")}
            disabled={isFirst || pending}
            className={btn}
            title="Move up"
            aria-label={`Move ${group.label} up`}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || pending}
            className={btn}
            title="Move down"
            aria-label={`Move ${group.label} down`}
          >
            ↓
          </button>
        </div>
      </td>
      <td className="px-2 py-1.5 text-muted-foreground">{group.key}</td>
      <td className="px-2 py-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-label={`Label for ${group.label}`}
          className={`${field} w-48`}
        />
      </td>
      <td className="px-2 py-1.5">
        {armed ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-danger">
              Delete {group.label} permanently? Its branches are left without a group.
            </span>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete group"}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={!dirty || pending}
              aria-label={`Save ${group.label}`}
              className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus(null);
                setArmed(true);
              }}
              title={`Delete ${group.label}`}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span className="sr-only">Delete {group.label}</span>
            </button>
            <StatusText status={status} />
          </div>
        )}
      </td>
    </tr>
  );
}

function NewGroupRow({ slug }: { slug: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const fd = new FormData();
    fd.set("label", label.trim());
    fd.set("sortOrder", "999");
    start(async () => {
      const r = await saveBranchGroup(fd, slug);
      setStatus(r);
      if (r.ok) {
        setLabel("");
        router.refresh();
      }
    });
  }

  return (
    <tr className="bg-muted/30">
      <td className="px-2 py-1.5 text-xs text-muted-foreground">+</td>
      <td></td>
      <td className="px-2 py-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, e.g. Retail (B2C)"
          aria-label="Label for new channel group"
          className={`${field} w-48`}
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={add}
            disabled={!label.trim() || pending}
            className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}
          >
            {pending ? "Adding…" : "Add group"}
          </button>
          <StatusText status={status} />
        </div>
      </td>
    </tr>
  );
}

// -------------------------------------------------------------------- Branches

function BranchEditor({
  branch,
  groups,
  slug,
  isFirst,
  isLast,
}: {
  branch: Branch;
  groups: BranchGroup[];
  slug: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(branch.label);
  const [groupId, setGroupId] = useState(branch.groupId ?? "");
  const [status, setStatus] = useState<BranchActionState | null>(null);
  // Which destructive step is waiting for its confirm click.
  const [arming, setArming] = useState<"archive" | "delete" | null>(null);
  const [pending, start] = useTransition();

  const dirty = label !== branch.label || groupId !== (branch.groupId ?? "");
  const archived = Boolean(branch.archivedAt);

  function save() {
    const fd = new FormData();
    fd.set("id", branch.id);
    fd.set("key", branch.key);
    fd.set("label", label.trim());
    fd.set("groupId", groupId);
    fd.set("sortOrder", String(branch.sortOrder));
    start(async () => {
      const r = await saveBranch(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  // Archiving asks first (in-page armed confirm, never window.confirm);
  // restoring an archived branch is harmless, so it acts at once.
  function toggleArchive() {
    setArming(null);
    start(async () => {
      const r = archived ? await unarchiveBranch(branch.id, slug) : await archiveBranch(branch.id, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  function remove() {
    start(async () => {
      const r = await deleteBranch(branch.id, slug);
      if (!r.ok) {
        setStatus(r);
        setArming(null);
        return;
      }
      router.refresh();
    });
  }
  function move(direction: "up" | "down") {
    start(async () => {
      const r = await moveBranch(branch.id, direction, slug);
      if (!r.ok) {
        setStatus(r);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className={`border-b border-border/60 last:border-0 align-top ${archived ? "opacity-50" : ""}`}>
      <td className="whitespace-nowrap px-2 py-1.5">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => move("up")}
            disabled={isFirst || pending}
            className={btn}
            title="Move up"
            aria-label={`Move ${branch.label} up`}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || pending}
            className={btn}
            title="Move down"
            aria-label={`Move ${branch.label} down`}
          >
            ↓
          </button>
        </div>
      </td>
      <td className="px-2 py-1.5 text-muted-foreground">{branch.key}</td>
      <td className="px-2 py-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={archived}
          aria-label={`Label for ${branch.label}`}
          className={`${field} w-56`}
        />
        {archived && <span className="ms-1.5 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">archived</span>}
      </td>
      <td className="px-2 py-1.5">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={archived}
          aria-label={`Group for ${branch.label}`}
          className={`${field} w-44`}
        >
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        {arming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-danger">
              {arming === "delete"
                ? `Delete ${branch.label} permanently? Months uploaded with it fall back to Consolidated.`
                : `Archive ${branch.label}? It leaves future uploads and the scope selector; past months stay in Consolidated totals.`}
            </span>
            <button
              type="button"
              onClick={arming === "delete" ? remove : toggleArchive}
              disabled={pending}
              className="rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60"
            >
              {arming === "delete"
                ? pending
                  ? "Deleting…"
                  : "Delete branch"
                : pending
                  ? "Archiving…"
                  : "Archive branch"}
            </button>
            <button
              type="button"
              onClick={() => setArming(null)}
              className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {!archived && (
              <button
                onClick={save}
                disabled={!dirty || pending}
                aria-label={`Save ${branch.label}`}
                className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}
              >
                {pending ? "Saving…" : "Save"}
              </button>
            )}
            <button
              onClick={() => {
                if (archived) {
                  toggleArchive();
                } else {
                  setStatus(null);
                  setArming("archive");
                }
              }}
              disabled={pending}
              aria-label={`${archived ? "Restore" : "Archive"} ${branch.label}`}
              className={`${btn} ${archived ? "" : "hover:border-danger hover:text-danger"}`}
            >
              {archived ? "Restore" : "Archive"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus(null);
                setArming("delete");
              }}
              disabled={pending}
              title={`Permanently delete ${branch.label}`}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-40"
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span className="sr-only">Permanently delete {branch.label}</span>
            </button>
            <StatusText status={status} />
          </div>
        )}
      </td>
    </tr>
  );
}

function NewBranchRow({ groups, slug }: { groups: BranchGroup[]; slug: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const fd = new FormData();
    fd.set("label", label.trim());
    fd.set("groupId", groupId);
    fd.set("sortOrder", "999");
    start(async () => {
      const r = await saveBranch(fd, slug);
      setStatus(r);
      if (r.ok) {
        setLabel("");
        setGroupId("");
        router.refresh();
      }
    });
  }

  return (
    <tr className="bg-muted/30">
      <td className="px-2 py-1.5 text-xs text-muted-foreground">+</td>
      <td></td>
      <td className="px-2 py-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, exactly as Tally shows it"
          aria-label="Label for new branch"
          className={`${field} w-56`}
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          aria-label="Group for new branch"
          className={`${field} w-44`}
        >
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={add}
            disabled={!label.trim() || pending}
            className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}
          >
            {pending ? "Adding…" : "Add branch"}
          </button>
          <StatusText status={status} />
        </div>
      </td>
    </tr>
  );
}

function CloneBanner({ slug, cloneSources }: { slug: string; cloneSources: CompanySummary[] }) {
  const router = useRouter();
  const [source, setSource] = useState(cloneSources[0]?.slug ?? "");
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [pending, start] = useTransition();

  function clone() {
    if (!source) return;
    start(async () => {
      const r = await cloneBranchesFrom(source, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-medium text-foreground">
        No branches yet — start from an existing company&rsquo;s roster, or add branches below.
      </p>
      {cloneSources.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label="Company to clone branches from"
            className={`${field} w-56`}
          >
            {cloneSources.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={clone} disabled={pending} className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}>
            {pending ? "Cloning…" : "Clone branches"}
          </button>
          <StatusText status={status} />
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------- Report Scope

function ReportScopeRow({
  report,
  label,
  hint,
  depth,
  disabled,
  slug,
}: {
  report: ReportKind;
  label: string;
  hint: string;
  depth: ScopeDepth;
  disabled: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(depth);
  const [status, setStatus] = useState<BranchActionState | null>(null);
  const [pending, start] = useTransition();

  function change(next: ScopeDepth) {
    setValue(next);
    start(async () => {
      const r = await saveReportScopeDepth(report, next, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-2 py-1.5 font-medium">{label}</td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground">{hint}</td>
      <td className="px-2 py-1.5">
        <select
          value={value}
          disabled={disabled || pending}
          onChange={(e) => change(e.target.value as ScopeDepth)}
          aria-label={`Scope depth for ${label}`}
          className={`${field} w-64`}
        >
          {DEPTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <StatusText status={status} />
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------------- root

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
  const noBranches = branches.length === 0;

  return (
    <div className="space-y-6">
      {noBranches && <CloneBanner slug={slug} cloneSources={cloneSources} />}

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Channel Groups</span>
          <span className="ms-2 text-xs text-muted-foreground">
            Optional — a mid-level rollup for branches (e.g. Retail vs Wholesale). Leave empty if this
            company just needs individual branches, no grouping.
          </span>
        </div>
        <div tabIndex={0} role="region" aria-label="Channel groups" className={`overflow-x-auto rounded-b-xl ${focusRing}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Order</span></th>
                <th className="px-2 py-1.5 font-semibold">Key</th>
                <th className="px-2 py-1.5 font-semibold">Label</th>
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <GroupEditor key={g.id} group={g} slug={slug} isFirst={i === 0} isLast={i === groups.length - 1} />
              ))}
              <NewGroupRow slug={slug} />
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Branches</span>
          <span className="ms-2 text-xs text-muted-foreground">
            One row per Tally branch column — label must match exactly what Tally shows, so re-uploads
            match automatically.
          </span>
        </div>
        <div tabIndex={0} role="region" aria-label="Branches" className={`overflow-x-auto rounded-b-xl ${focusRing}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Order</span></th>
                <th className="px-2 py-1.5 font-semibold">Key</th>
                <th className="px-2 py-1.5 font-semibold">Label</th>
                <th className="px-2 py-1.5 font-semibold">Group</th>
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b, i) => (
                <BranchEditor
                  key={b.id}
                  branch={b}
                  groups={groups}
                  slug={slug}
                  isFirst={i === 0}
                  isLast={i === branches.length - 1}
                />
              ))}
              <NewBranchRow groups={groups} slug={slug} />
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Report Scope</span>
          <span className="ms-2 text-xs text-muted-foreground">
            How far each report&rsquo;s branch selector and Excel export can split this company&rsquo;s
            figures: the whole company only, also by channel group, or down to single branches. Every
            report starts at Consolidated only.
          </span>
        </div>
        <div tabIndex={0} role="region" aria-label="Report scope" className={`overflow-x-auto rounded-b-xl ${focusRing}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
                <th className="px-2 py-1.5 font-semibold">Report</th>
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">About</span></th>
                <th className="px-2 py-1.5 font-semibold">Scope depth</th>
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Status</span></th>
              </tr>
            </thead>
            <tbody>
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
            </tbody>
          </table>
        </div>
        {activeBranches.length === 0 && (
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Add at least one branch above to change these — there&rsquo;s nothing to scope to yet.
          </p>
        )}
      </div>
    </div>
  );
}
