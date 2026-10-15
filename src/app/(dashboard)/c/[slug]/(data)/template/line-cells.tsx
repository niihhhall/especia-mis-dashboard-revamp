"use client";

import type { TemplateLine } from "@/lib/mis/catalog";

import { CELL, FIELD } from "./template-ui";

/** The editable values of one template line, shared by the edit and the new row. */
export interface LineDraft {
  kind: TemplateLine["kind"];
  key: string;
  label: string;
  grouping: string;
  manualKey: string;
  fallbackGrouping: string;
  negate: boolean;
}

export const draftOf = (l?: TemplateLine): LineDraft => ({
  kind: l?.kind ?? "grouping",
  key: l?.key ?? "",
  label: l?.label ?? "",
  grouping: l?.grouping ?? "",
  manualKey: l?.manualKey ?? "",
  fallbackGrouping: l?.fallbackGrouping ?? "",
  negate: l?.negate ?? false,
});

/** Writes a draft into the FormData the save action reads. */
export function fillLine(fd: FormData, d: LineDraft) {
  fd.set("kind", d.kind);
  fd.set("key", d.key.trim());
  fd.set("label", d.label.trim());
  fd.set("grouping", d.grouping.trim());
  fd.set("manualKey", d.manualKey.trim());
  fd.set("fallbackGrouping", d.fallbackGrouping.trim());
  if (d.negate) fd.set("negate", "on");
}

/** Key, Label, Kind, Source and Negate cells. `name` goes into every accessible name. */
export function LineCells({ d, set, name, placeholders = false }: {
  d: LineDraft;
  set: (patch: Partial<LineDraft>) => void;
  name: string;
  placeholders?: boolean;
}) {
  return (
    <>
      <td className={CELL}>
        <input value={d.key} onChange={(e) => set({ key: e.target.value })} placeholder={placeholders ? "key" : undefined} aria-label={`Key for ${name}`} className={`${FIELD} w-32`} />
      </td>
      <td className={CELL}>
        <input value={d.label} onChange={(e) => set({ label: e.target.value })} placeholder={placeholders ? "Label" : undefined} aria-label={`Label for ${name}`} className={`${FIELD} w-44`} />
      </td>
      <td className={CELL}>
        <select value={d.kind} onChange={(e) => set({ kind: e.target.value as TemplateLine["kind"] })} aria-label={`Kind for ${name}`} className={`${FIELD} w-28`}>
          <option value="grouping">grouping</option>
          <option value="manual">manual</option>
          <option value="computed">computed</option>
        </select>
      </td>
      <td className={CELL}>
        {(d.kind === "grouping" || d.kind === "computed") && (
          <input value={d.grouping} onChange={(e) => set({ grouping: e.target.value })} placeholder="Grouping name" aria-label={`Grouping for ${name}`} className={`${FIELD} w-40`} />
        )}
        {d.kind === "manual" && (
          <div className="space-y-1">
            <input value={d.manualKey} onChange={(e) => set({ manualKey: e.target.value })} placeholder="Manual key" aria-label={`Manual key for ${name}`} className={`${FIELD} w-40`} />
            <input
              value={d.fallbackGrouping}
              onChange={(e) => set({ fallbackGrouping: e.target.value })}
              placeholder="Fallback grouping (optional)"
              aria-label={`Fallback grouping for ${name}`}
              className={`${FIELD} w-40`}
            />
          </div>
        )}
      </td>
      <td className={`${CELL} text-center`}>
        {d.kind !== "computed" && (
          <input type="checkbox" checked={d.negate} onChange={(e) => set({ negate: e.target.checked })} aria-label={`Negate ${name}`} />
        )}
      </td>
    </>
  );
}
