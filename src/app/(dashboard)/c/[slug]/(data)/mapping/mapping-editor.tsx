"use client";

import { useMemo, useState, useTransition } from "react";

import { ActionStatus } from "@/components/action-status";
import { fieldText, focusRing } from "@/lib/ui-classes";
import { guessBsPl } from "@/lib/mis/bs-pl";
import { SECTIONS_BY_BS_PL, UNIVERSAL_NO_TEMPLATE_GROUPINGS, type TemplateSection } from "@/lib/mis/catalog";

import { saveMapping } from "./actions";
import { BulkMappingForm } from "./bulk-mapping-form";

export interface MapEntry {
  ledger: string;
  grouping: string;
  bsPl: "B.S" | "P.L";
  classification: string | null;
}
export interface UnmappedLedger {
  ledger: string;
  classification: string;
  suggestion: string;
}

function EditableRow({
  ledger,
  initialGrouping,
  initialBsPl,
  classification,
  groupings,
  templatedGroupings,
  highlight,
  requireChoice,
  slug,
}: {
  ledger: string;
  initialGrouping: string;
  initialBsPl: "B.S" | "P.L";
  classification: string | null;
  groupings: string[];
  /** Groupings that already have an MIS Template line — the Section picker
   * hides itself for these (nothing to auto-create; edit the existing line
   * on the Template page instead). */
  templatedGroupings: Set<string>;
  highlight?: boolean;
  /** Unmapped rows must be assigned deliberately — no pre-selected grouping. */
  requireChoice?: boolean;
  slug: string;
}) {
  const [grouping, setGrouping] = useState(initialGrouping);
  const [custom, setCustom] = useState(initialGrouping !== "" && !groupings.includes(initialGrouping));
  const [bsPl, setBsPl] = useState<"B.S" | "P.L">(initialBsPl);
  const [section, setSection] = useState<TemplateSection | "">("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = grouping.trim() !== "" && (grouping.trim() !== initialGrouping || bsPl !== initialBsPl);

  // Section picker only makes sense for a grouping the engine doesn't already
  // compute directly, and only while no template line exists for it yet.
  const trimmedGrouping = grouping.trim();
  const needsSection =
    trimmedGrouping !== "" &&
    !UNIVERSAL_NO_TEMPLATE_GROUPINGS.has(trimmedGrouping) &&
    !templatedGroupings.has(trimmedGrouping);
  const sectionOptions = SECTIONS_BY_BS_PL[bsPl];

  function save() {
    const fd = new FormData();
    fd.set("ledger", ledger);
    fd.set("grouping", grouping.trim());
    fd.set("bsPl", bsPl);
    if (classification) fd.set("classification", classification);
    if (needsSection && section) fd.set("section", section);
    start(async () => {
      const r = await saveMapping(fd, slug);
      setStatus({ ok: r.ok, text: r.ok ? `"${ledger}" saved.` : r.message });
    });
  }

  return (
    <tr className={`border-b border-border/60 last:border-0 ${highlight ? "bg-danger/5" : ""}`}>
      <td className="px-3 py-1.5">{ledger}</td>
      <td className="px-3 py-1.5 text-muted-foreground">{classification ?? "—"}</td>
      <td className="px-3 py-1.5">
        {custom ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={grouping}
              onChange={(e) => setGrouping(e.target.value)}
              placeholder="New grouping name"
              aria-label={`New grouping for ${ledger}`}
              className="w-48 rounded-md border border-border bg-card px-2 py-1 text-sm"
            />
            <button
              type="button"
              title="Back to list"
              aria-label="Back to grouping list"
              onClick={() => {
                setCustom(false);
                setGrouping(
                  requireChoice
                    ? ""
                    : groupings.includes(initialGrouping)
                      ? initialGrouping
                      : (groupings[0] ?? ""),
                );
              }}
              className="px-1 text-sm text-muted-foreground hover:text-foreground"
            >
              ↩
            </button>
          </div>
        ) : (
          <select
            value={grouping}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setCustom(true);
                setGrouping("");
              } else {
                setGrouping(e.target.value);
              }
            }}
            aria-label={`Grouping for ${ledger}`}
            className={`w-56 rounded-md border bg-card px-2 py-1 text-sm ${
              grouping === "" ? "border-danger text-muted-foreground" : "border-border"
            }`}
          >
            {/* Forces a deliberate pick: an unmapped ledger starts with nothing
                selected rather than silently defaulting to Other Expenses. */}
            {grouping === "" && (
              <option value="" disabled>
                — Choose grouping —
              </option>
            )}
            {!groupings.includes(grouping) && grouping !== "" && (
              <option value={grouping}>{grouping}</option>
            )}
            {groupings.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value="__new__">➕ New grouping…</option>
          </select>
        )}
      </td>
      <td className="px-3 py-1.5">
        <select
          value={bsPl}
          onChange={(e) => setBsPl(e.target.value as "B.S" | "P.L")}
          aria-label={`B.S or P.L for ${ledger}`}
          className="rounded-md border border-border bg-card px-2 py-1 text-sm"
        >
          <option value="B.S">B.S</option>
          <option value="P.L">P.L</option>
        </select>
      </td>
      <td className="px-3 py-1.5">
        {needsSection ? (
          <select
            value={sectionOptions.some((o) => o.value === section) ? section : ""}
            onChange={(e) => setSection(e.target.value as TemplateSection)}
            aria-label={`Template section for ${ledger}`}
            className="w-56 rounded-md border border-border bg-card px-2 py-1 text-sm"
            title="Also add this grouping to the MIS Template, in this section"
          >
            <option value="">— No template line —</option>
            {sectionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : trimmedGrouping !== "" ? (
          <span className="text-xs text-muted-foreground">
            {UNIVERSAL_NO_TEMPLATE_GROUPINGS.has(trimmedGrouping)
              ? "Calculated for every company — no template line needed"
              : "Already a line in the MIS template"}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={!dirty || pending}
            aria-label={`Save ${ledger}`}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <ActionStatus state={status && { ok: status.ok, message: status.text }} className="text-xs" />
        </div>
      </td>
    </tr>
  );
}

export function MappingManager({
  entries,
  unmapped,
  groupings,
  templatedGroupings,
  slug,
}: {
  entries: MapEntry[];
  unmapped: UnmappedLedger[];
  groupings: string[];
  /** Groupings that already have an MIS Template line — see `EditableRow`. */
  templatedGroupings: Set<string>;
  slug: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return entries;
    return entries.filter((e) => e.ledger.toLowerCase().includes(n) || e.grouping.toLowerCase().includes(n));
  }, [entries, q]);

  return (
    <div className="space-y-8">
      <BulkMappingForm slug={slug} />

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          Unmapped ledgers {unmapped.length > 0 && <span className="text-danger">({unmapped.length})</span>}
        </h2>
        {unmapped.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            No unmapped ledgers — every ledger in the latest Trial Balance is mapped.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Unmapped ledgers"
            className={`overflow-x-auto rounded-xl border border-border bg-card ${focusRing}`}
          >
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Ledger</th>
                  <th className="px-3 py-2 font-semibold">Classification</th>
                  <th className="px-3 py-2 font-semibold">Grouping</th>
                  <th className="px-3 py-2 font-semibold">B.S/P.L</th>
                  <th className="px-3 py-2 font-semibold">Section</th>
                  <th className="px-3 py-2 font-semibold"><span className="sr-only">Save</span></th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((u) => (
                  <EditableRow
                    key={u.ledger}
                    ledger={u.ledger}
                    initialGrouping=""
                    initialBsPl={guessBsPl(u.classification)}
                    classification={u.classification}
                    groupings={groupings}
                    templatedGroupings={templatedGroupings}
                    highlight
                    requireChoice
                    slug={slug}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Ledger map ({entries.length})</h2>
          <div className="flex items-center gap-3">
            {/* Always mounted, so a screen reader hears each new count. */}
            <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
              {q.trim() ? `${filtered.length} of ${entries.length} shown` : ""}
            </span>
            <label className="block">
              <span className="sr-only">Search the ledger map</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. Rent"
                className={`w-64 rounded-md border border-border bg-card px-3 py-1.5 ${fieldText} ${focusRing}`}
              />
            </label>
          </div>
        </div>
        <div
          tabIndex={0}
          role="region"
          aria-label="Ledger map"
          className={`overflow-x-auto rounded-xl border border-border bg-card ${focusRing}`}
        >
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-overline uppercase text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Ledger</th>
                <th className="px-3 py-2 font-semibold">Classification</th>
                <th className="px-3 py-2 font-semibold">Grouping</th>
                <th className="px-3 py-2 font-semibold">B.S/P.L</th>
                <th className="px-3 py-2 font-semibold">Section</th>
                <th className="px-3 py-2 font-semibold"><span className="sr-only">Save</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && q.trim() ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No ledgers match &lsquo;{q.trim()}&rsquo;.{" "}
                    <button
                      type="button"
                      onClick={() => setQ("")}
                      className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                    >
                      Clear search
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <EditableRow
                    key={e.ledger}
                    ledger={e.ledger}
                    initialGrouping={e.grouping}
                    initialBsPl={e.bsPl}
                    classification={e.classification}
                    groupings={groupings}
                    templatedGroupings={templatedGroupings}
                    slug={slug}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
