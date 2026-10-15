"use client";

import { useState, useTransition } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import { SECTIONS_BY_BS_PL, UNIVERSAL_NO_TEMPLATE_GROUPINGS, type TemplateSection } from "@/lib/mis/catalog";
import { fieldClass } from "@/lib/ui-classes";

import { saveMapping } from "./actions";
import { GroupingSelect } from "./grouping-select";

export const CELL = "px-3 py-2 first:ps-5 last:pe-5";

export function EditableRow({
  ledger,
  initialGrouping,
  initialBsPl,
  classification,
  groupings,
  templatedGroupings,
  requireChoice,
  slug,
}: {
  ledger: string;
  initialGrouping: string;
  initialBsPl: "B.S" | "P.L";
  classification: string | null;
  groupings: string[];
  /** Groupings that already have an MIS Template line: the Section picker
   * hides itself for these (nothing to auto-create; edit the existing line
   * on the Template page instead). */
  templatedGroupings: Set<string>;
  /** Unmapped rows must be assigned deliberately: no pre-selected grouping. */
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
    trimmedGrouping !== "" && !UNIVERSAL_NO_TEMPLATE_GROUPINGS.has(trimmedGrouping) && !templatedGroupings.has(trimmedGrouping);
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
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-surface-raised">
      <td className={`${CELL} text-text-primary`}>{ledger}</td>
      <td className={`${CELL} text-text-secondary`}>{classification ?? "-"}</td>
      <td className={CELL}>
        <GroupingSelect
          ledger={ledger}
          grouping={grouping}
          custom={custom}
          groupings={groupings}
          onChange={setGrouping}
          onCustom={() => {
            setCustom(true);
            setGrouping("");
          }}
          onBack={() => {
            setCustom(false);
            setGrouping(requireChoice ? "" : groupings.includes(initialGrouping) ? initialGrouping : (groupings[0] ?? ""));
          }}
        />
      </td>
      <td className={CELL}>
        <select value={bsPl} onChange={(e) => setBsPl(e.target.value as "B.S" | "P.L")} aria-label={`B.S or P.L for ${ledger}`} className={fieldClass}>
          <option value="B.S">B.S</option>
          <option value="P.L">P.L</option>
        </select>
      </td>
      <td className={CELL}>
        {needsSection ? (
          <select
            value={sectionOptions.some((o) => o.value === section) ? section : ""}
            onChange={(e) => setSection(e.target.value as TemplateSection)}
            aria-label={`Template section for ${ledger}`}
            className={`${fieldClass} w-56`}
            title="Also add this grouping to the MIS template, in this section"
          >
            <option value="">- No template line -</option>
            {sectionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : trimmedGrouping !== "" ? (
          <span className="text-label text-text-secondary">
            {UNIVERSAL_NO_TEMPLATE_GROUPINGS.has(trimmedGrouping)
              ? "Calculated for every company: no template line needed"
              : "Already a line in the MIS template"}
          </span>
        ) : null}
      </td>
      <td className={CELL}>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={!dirty || pending} aria-label={`Save ${ledger}`} className="h-8 rounded-md text-body">
            {pending ? "Saving…" : "Save"}
          </Button>
          <ActionStatus state={status && { ok: status.ok, message: status.text }} className="text-label" />
        </div>
      </td>
    </tr>
  );
}
