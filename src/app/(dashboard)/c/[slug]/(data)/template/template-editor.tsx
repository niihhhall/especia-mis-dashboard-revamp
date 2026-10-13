"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActionStatus } from "@/components/action-status";
import type { CompanySummary } from "@/lib/data/company-context";
import type { SegmentDef, TemplateLine, TemplateSection } from "@/lib/mis/catalog";
import { fieldText, focusRing } from "@/lib/ui-classes";

import {
  cloneTemplateFrom,
  deleteSegment,
  deleteTemplateLine,
  moveSegment,
  moveTemplateLine,
  saveSegment,
  saveTemplateLine,
  type TemplateActionState,
} from "./actions";

type LineRow = TemplateLine & { id: string };
type SegmentRow = SegmentDef & { id: string };

const SECTIONS: { key: TemplateSection; label: string; hint: string }[] = [
  { key: "revenue", label: "Revenue", hint: "Sums into Revenue From Operations" },
  { key: "purchase", label: "Purchase", hint: "Part of COGS" },
  { key: "direct_expense", label: "Direct Expense", hint: "Part of COGS" },
  { key: "indirect_income", label: "Indirect Income", hint: "Below Gross Profit" },
  { key: "indirect_expense", label: "Indirect Expense", hint: "Below Gross Profit, drives EBITDA" },
  { key: "btb_current_liability", label: "Book to Bank — Current Liabilities", hint: "Working-capital detail" },
  { key: "btb_current_asset", label: "Book to Bank — Current Assets", hint: "Working-capital detail" },
  { key: "btb_loan_liability", label: "Book to Bank — Loan / Liability", hint: "Extra particulars alongside the universal Unsecured Loans line" },
  { key: "btb_capital", label: "Book to Bank — Change in Capital", hint: "Extra particulars alongside the universal Capital A/c line" },
  { key: "btb_fixed_asset", label: "Book to Bank — Fixed Assets", hint: "Extra particulars alongside Purchase/Sale of fixed assets" },
  { key: "btb_investment", label: "Book to Bank — Investments", hint: "Own section — only shows when a company has lines here" },
  { key: "btb_branch", label: "Book to Bank — Branch Balances", hint: "Own section — only shows when a company has lines here" },
];

function sectionLabel(section: TemplateSection): string {
  return SECTIONS.find((s) => s.key === section)?.label ?? section;
}

const field = `w-full rounded-md border border-border bg-card px-2 py-1 ${fieldText} ${focusRing}`;
const btn =
  "inline-flex h-7 items-center rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40";
const dangerBtn =
  "rounded-md bg-danger px-2 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-60";
const cancelBtn =
  "rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted";

function StatusText({ status }: { status: TemplateActionState | null }) {
  return <ActionStatus state={status} className="text-xs" />;
}

/**
 * Every editor row below calls `router.refresh()` after a successful
 * mutation — the Server Actions already call `revalidatePath`, but that only
 * marks the route stale; `refresh()` is what actually re-fetches this page's
 * Server Component data so the row list (adds/deletes/reorders) reflects it.
 * A row's OWN in-progress edit (its local `useState`) doesn't re-sync from
 * the refreshed props while that row stays mounted — a known, minor rough
 * edge (reload the page to see the saved value re-confirmed) rather than
 * something worth a bigger state-sync mechanism for a staff-only tool.
 *
 * Deletes use the in-page armed confirm (as on company-card.tsx), never
 * `window.confirm`, which silently does nothing when a browser suppresses it.
 */
function LineEditor({
  line,
  slug,
  isFirst,
  isLast,
}: {
  line: LineRow;
  slug: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState(line.kind);
  const [key, setKey] = useState(line.key);
  const [label, setLabel] = useState(line.label);
  const [grouping, setGrouping] = useState(line.grouping ?? "");
  const [manualKey, setManualKey] = useState(line.manualKey ?? "");
  const [fallbackGrouping, setFallbackGrouping] = useState(line.fallbackGrouping ?? "");
  const [negate, setNegate] = useState(line.negate ?? false);
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  const dirty =
    kind !== line.kind ||
    key !== line.key ||
    label !== line.label ||
    grouping !== (line.grouping ?? "") ||
    manualKey !== (line.manualKey ?? "") ||
    fallbackGrouping !== (line.fallbackGrouping ?? "") ||
    negate !== (line.negate ?? false);

  function save() {
    const fd = new FormData();
    fd.set("id", line.id);
    fd.set("section", line.section);
    fd.set("sortOrder", String(line.sortOrder));
    fd.set("kind", kind);
    fd.set("key", key.trim());
    fd.set("label", label.trim());
    fd.set("grouping", grouping.trim());
    fd.set("manualKey", manualKey.trim());
    fd.set("fallbackGrouping", fallbackGrouping.trim());
    if (negate) fd.set("negate", "on");
    start(async () => {
      const r = await saveTemplateLine(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }

  function del() {
    start(async () => {
      const r = await deleteTemplateLine(line.id, slug);
      setStatus(r);
      setArmed(false);
      if (r.ok) router.refresh();
    });
  }

  function move(direction: "up" | "down") {
    start(async () => {
      // A refusal (e.g. demo mode) must say so, or the arrow looks broken.
      const r = await moveTemplateLine(line.id, direction, slug);
      if (!r.ok) {
        setStatus(r);
        return;
      }
      router.refresh();
    });
  }

  const name = line.label;

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
            aria-label={`Move ${name} up`}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || pending}
            className={btn}
            title="Move down"
            aria-label={`Move ${name} down`}
          >
            ↓
          </button>
        </div>
      </td>
      <td className="px-2 py-1.5">
        <input value={key} onChange={(e) => setKey(e.target.value)} aria-label={`Key for ${name}`} className={`${field} w-32`} />
      </td>
      <td className="px-2 py-1.5">
        <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={`Label for ${name}`} className={`${field} w-44`} />
      </td>
      <td className="px-2 py-1.5">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TemplateLine["kind"])}
          aria-label={`Kind for ${name}`}
          className={`${field} w-28`}
        >
          <option value="grouping">grouping</option>
          <option value="manual">manual</option>
          <option value="computed">computed</option>
        </select>
      </td>
      <td className="px-2 py-1.5">
        {(kind === "grouping" || kind === "computed") && (
          <input
            value={grouping}
            onChange={(e) => setGrouping(e.target.value)}
            placeholder="Grouping name"
            aria-label={`Grouping for ${name}`}
            className={`${field} w-40`}
          />
        )}
        {kind === "manual" && (
          <div className="space-y-1">
            <input
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="Manual key"
              aria-label={`Manual key for ${name}`}
              className={`${field} w-40`}
            />
            <input
              value={fallbackGrouping}
              onChange={(e) => setFallbackGrouping(e.target.value)}
              placeholder="Fallback grouping (optional)"
              aria-label={`Fallback grouping for ${name}`}
              className={`${field} w-40`}
            />
          </div>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {kind !== "computed" && (
          <input
            type="checkbox"
            checked={negate}
            onChange={(e) => setNegate(e.target.checked)}
            aria-label={`Negate ${name}`}
          />
        )}
      </td>
      <td className="px-2 py-1.5">
        {armed ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-danger">
              Delete &ldquo;{name}&rdquo;? It&rsquo;s removed from every report.
            </span>
            <button type="button" onClick={del} disabled={pending} className={dangerBtn}>
              {pending ? "Deleting…" : "Delete line"}
            </button>
            <button type="button" onClick={() => setArmed(false)} className={cancelBtn}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={!dirty || pending} aria-label={`Save ${name}`} className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus(null);
                setArmed(true);
              }}
              disabled={pending}
              aria-label={`Delete ${name}`}
              className={`${btn} hover:border-danger hover:text-danger`}
            >
              Delete
            </button>
            <StatusText status={status} />
          </div>
        )}
      </td>
    </tr>
  );
}

function NewLineRow({ section, slug }: { section: TemplateSection; slug: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<TemplateLine["kind"]>("grouping");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [grouping, setGrouping] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [fallbackGrouping, setFallbackGrouping] = useState("");
  const [negate, setNegate] = useState(false);
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [pending, start] = useTransition();
  const where = `new ${sectionLabel(section)} line`;

  function add() {
    const fd = new FormData();
    fd.set("section", section);
    fd.set("sortOrder", "999");
    fd.set("kind", kind);
    fd.set("key", key.trim());
    fd.set("label", label.trim());
    fd.set("grouping", grouping.trim());
    fd.set("manualKey", manualKey.trim());
    fd.set("fallbackGrouping", fallbackGrouping.trim());
    if (negate) fd.set("negate", "on");
    start(async () => {
      const r = await saveTemplateLine(fd, slug);
      setStatus(r);
      if (r.ok) {
        setKind("grouping");
        setKey("");
        setLabel("");
        setGrouping("");
        setManualKey("");
        setFallbackGrouping("");
        setNegate(false);
        router.refresh();
      }
    });
  }

  return (
    <tr className="bg-muted/30">
      <td className="px-2 py-1.5 text-xs text-muted-foreground">+</td>
      <td className="px-2 py-1.5">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" aria-label={`Key for ${where}`} className={`${field} w-32`} />
      </td>
      <td className="px-2 py-1.5">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" aria-label={`Label for ${where}`} className={`${field} w-44`} />
      </td>
      <td className="px-2 py-1.5">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TemplateLine["kind"])}
          aria-label={`Kind for ${where}`}
          className={`${field} w-28`}
        >
          <option value="grouping">grouping</option>
          <option value="manual">manual</option>
          <option value="computed">computed</option>
        </select>
      </td>
      <td className="px-2 py-1.5">
        {(kind === "grouping" || kind === "computed") && (
          <input
            value={grouping}
            onChange={(e) => setGrouping(e.target.value)}
            placeholder="Grouping name"
            aria-label={`Grouping for ${where}`}
            className={`${field} w-40`}
          />
        )}
        {kind === "manual" && (
          <div className="space-y-1">
            <input
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="Manual key"
              aria-label={`Manual key for ${where}`}
              className={`${field} w-40`}
            />
            <input
              value={fallbackGrouping}
              onChange={(e) => setFallbackGrouping(e.target.value)}
              placeholder="Fallback grouping (optional)"
              aria-label={`Fallback grouping for ${where}`}
              className={`${field} w-40`}
            />
          </div>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {kind !== "computed" && (
          <input
            type="checkbox"
            checked={negate}
            onChange={(e) => setNegate(e.target.checked)}
            aria-label={`Negate ${where}`}
          />
        )}
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={add}
            disabled={!key.trim() || !label.trim() || pending}
            aria-label={`Add line to ${sectionLabel(section)}`}
            className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}
          >
            {pending ? "Adding…" : "Add line"}
          </button>
          <StatusText status={status} />
        </div>
      </td>
    </tr>
  );
}

function SectionTable({ section, hint, lines, slug }: { section: TemplateSection; hint: string; lines: LineRow[]; slug: string }) {
  const name = sectionLabel(section);
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">{name}</span>
        <span className="ms-2 text-xs text-muted-foreground">{hint}</span>
      </div>
      <div tabIndex={0} role="region" aria-label={`${name} template lines`} className={`overflow-x-auto rounded-b-xl ${focusRing}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
              <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Order</span></th>
              <th className="px-2 py-1.5 font-semibold">Key</th>
              <th className="px-2 py-1.5 font-semibold">Label</th>
              <th className="px-2 py-1.5 font-semibold">Kind</th>
              <th className="px-2 py-1.5 font-semibold">Source</th>
              <th className="px-2 py-1.5 font-semibold">Negate</th>
              <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <LineEditor key={l.id} line={l} slug={slug} isFirst={i === 0} isLast={i === lines.length - 1} />
            ))}
            <NewLineRow section={section} slug={slug} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SegmentEditor({ segment, slug, isFirst, isLast }: { segment: SegmentRow; slug: string; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState(segment.key);
  const [label, setLabel] = useState(segment.label);
  const [revenueGrouping, setRevenueGrouping] = useState(segment.revenueGrouping ?? "");
  const [revenueManualKey, setRevenueManualKey] = useState(segment.revenueManualKey ?? "");
  const [revenueFallbackGrouping, setRevenueFallbackGrouping] = useState(segment.revenueFallbackGrouping ?? "");
  const [purchaseGroupings, setPurchaseGroupings] = useState(segment.purchaseGroupings.join(", "));
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const name = `segment ${segment.label}`;

  function save() {
    const fd = new FormData();
    fd.set("id", segment.id);
    fd.set("sortOrder", String(segment.sortOrder));
    fd.set("key", key.trim());
    fd.set("label", label.trim());
    fd.set("revenueGrouping", revenueGrouping.trim());
    fd.set("revenueManualKey", revenueManualKey.trim());
    fd.set("revenueFallbackGrouping", revenueFallbackGrouping.trim());
    fd.set("purchaseGroupings", purchaseGroupings);
    start(async () => {
      const r = await saveSegment(fd, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }
  function del() {
    start(async () => {
      const r = await deleteSegment(segment.id, slug);
      setStatus(r);
      setArmed(false);
      if (r.ok) router.refresh();
    });
  }
  function move(direction: "up" | "down") {
    start(async () => {
      const r = await moveSegment(segment.id, direction, slug);
      if (!r.ok) {
        setStatus(r);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className="border-b border-border/60 last:border-0 align-top">
      <td className="whitespace-nowrap px-2 py-1.5">
        <div className="flex gap-0.5">
          <button type="button" onClick={() => move("up")} disabled={isFirst || pending} className={btn} title="Move up" aria-label={`Move ${name} up`}>↑</button>
          <button type="button" onClick={() => move("down")} disabled={isLast || pending} className={btn} title="Move down" aria-label={`Move ${name} down`}>↓</button>
        </div>
      </td>
      <td className="px-2 py-1.5"><input value={key} onChange={(e) => setKey(e.target.value)} aria-label={`Key for ${name}`} className={`${field} w-28`} /></td>
      <td className="px-2 py-1.5"><input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={`Label for ${name}`} className={`${field} w-36`} /></td>
      <td className="px-2 py-1.5 space-y-1">
        <input value={revenueGrouping} onChange={(e) => setRevenueGrouping(e.target.value)} placeholder="Revenue grouping" aria-label={`Revenue grouping for ${name}`} className={`${field} w-40`} />
        <input value={revenueManualKey} onChange={(e) => setRevenueManualKey(e.target.value)} placeholder="or manual key" aria-label={`Revenue manual key for ${name}`} className={`${field} w-40`} />
        <input value={revenueFallbackGrouping} onChange={(e) => setRevenueFallbackGrouping(e.target.value)} placeholder="fallback grouping" aria-label={`Revenue fallback grouping for ${name}`} className={`${field} w-40`} />
      </td>
      <td className="px-2 py-1.5">
        <input value={purchaseGroupings} onChange={(e) => setPurchaseGroupings(e.target.value)} placeholder="Purchase groupings, comma-separated" aria-label={`Purchase groupings for ${name}`} className={`${field} w-56`} />
      </td>
      <td className="px-2 py-1.5">
        {armed ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-danger">
              Delete segment &ldquo;{segment.label}&rdquo;? Its column leaves Segment P&amp;L.
            </span>
            <button type="button" onClick={del} disabled={pending} className={dangerBtn}>
              {pending ? "Deleting…" : "Delete segment"}
            </button>
            <button type="button" onClick={() => setArmed(false)} className={cancelBtn}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={pending} aria-label={`Save ${name}`} className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}>{pending ? "Saving…" : "Save"}</button>
            <button
              type="button"
              onClick={() => {
                setStatus(null);
                setArmed(true);
              }}
              disabled={pending}
              aria-label={`Delete ${name}`}
              className={`${btn} hover:border-danger hover:text-danger`}
            >
              Delete
            </button>
            <StatusText status={status} />
          </div>
        )}
      </td>
    </tr>
  );
}

function NewSegmentRow({ slug }: { slug: string }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [revenueGrouping, setRevenueGrouping] = useState("");
  const [revenueManualKey, setRevenueManualKey] = useState("");
  const [purchaseGroupings, setPurchaseGroupings] = useState("");
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [pending, start] = useTransition();
  const where = "new segment";

  function add() {
    const fd = new FormData();
    fd.set("sortOrder", "999");
    fd.set("key", key.trim());
    fd.set("label", label.trim());
    fd.set("revenueGrouping", revenueGrouping.trim());
    fd.set("revenueManualKey", revenueManualKey.trim());
    fd.set("purchaseGroupings", purchaseGroupings);
    start(async () => {
      const r = await saveSegment(fd, slug);
      setStatus(r);
      if (r.ok) {
        setKey("");
        setLabel("");
        setRevenueGrouping("");
        setRevenueManualKey("");
        setPurchaseGroupings("");
        router.refresh();
      }
    });
  }

  return (
    <tr className="bg-muted/30">
      <td className="px-2 py-1.5 text-xs text-muted-foreground">+</td>
      <td className="px-2 py-1.5"><input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" aria-label={`Key for ${where}`} className={`${field} w-28`} /></td>
      <td className="px-2 py-1.5"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" aria-label={`Label for ${where}`} className={`${field} w-36`} /></td>
      <td className="px-2 py-1.5 space-y-1">
        <input value={revenueGrouping} onChange={(e) => setRevenueGrouping(e.target.value)} placeholder="Revenue grouping" aria-label={`Revenue grouping for ${where}`} className={`${field} w-40`} />
        <input value={revenueManualKey} onChange={(e) => setRevenueManualKey(e.target.value)} placeholder="or manual key" aria-label={`Revenue manual key for ${where}`} className={`${field} w-40`} />
      </td>
      <td className="px-2 py-1.5">
        <input value={purchaseGroupings} onChange={(e) => setPurchaseGroupings(e.target.value)} placeholder="Purchase groupings, comma-separated" aria-label={`Purchase groupings for ${where}`} className={`${field} w-56`} />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <button onClick={add} disabled={!key.trim() || !label.trim() || pending} className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}>{pending ? "Adding…" : "Add segment"}</button>
          <StatusText status={status} />
        </div>
      </td>
    </tr>
  );
}

function CloneBanner({ slug, cloneSources }: { slug: string; cloneSources: CompanySummary[] }) {
  const router = useRouter();
  const [source, setSource] = useState(cloneSources[0]?.slug ?? "");
  const [status, setStatus] = useState<TemplateActionState | null>(null);
  const [pending, start] = useTransition();

  function clone() {
    if (!source) return;
    start(async () => {
      const r = await cloneTemplateFrom(source, slug);
      setStatus(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-medium text-foreground">No template yet — start from an existing company, or add lines below.</p>
      {cloneSources.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Company to clone the template from" className={`${field} w-56`}>
            {cloneSources.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <button onClick={clone} disabled={pending} className={`${btn} bg-primary text-white border-primary disabled:opacity-40`}>
            {pending ? "Cloning…" : "Clone template"}
          </button>
          <StatusText status={status} />
        </div>
      )}
    </div>
  );
}

export function TemplateManager({
  slug,
  template,
  segments,
  cloneSources,
}: {
  slug: string;
  template: LineRow[];
  segments: SegmentRow[];
  cloneSources: CompanySummary[];
}) {
  return (
    <div className="space-y-6">
      {template.length === 0 && <CloneBanner slug={slug} cloneSources={cloneSources} />}

      {SECTIONS.map((s) => (
        <SectionTable key={s.key} section={s.key} hint={s.hint} lines={template.filter((l) => l.section === s.key)} slug={slug} />
      ))}

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Segments</span>
          <span className="ms-2 text-xs text-muted-foreground">
            Optional — 0 segments hides Segment P&amp;L for this company.
          </span>
        </div>
        <div tabIndex={0} role="region" aria-label="Segments" className={`overflow-x-auto rounded-b-xl ${focusRing}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Order</span></th>
                <th className="px-2 py-1.5 font-semibold">Key</th>
                <th className="px-2 py-1.5 font-semibold">Label</th>
                <th className="px-2 py-1.5 font-semibold">Revenue source</th>
                <th className="px-2 py-1.5 font-semibold">Purchase groupings</th>
                <th className="px-2 py-1.5 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s, i) => (
                <SegmentEditor key={s.id} segment={s} slug={slug} isFirst={i === 0} isLast={i === segments.length - 1} />
              ))}
              <NewSegmentRow slug={slug} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
