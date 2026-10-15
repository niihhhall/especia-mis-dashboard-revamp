"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Card } from "@/components/shared/card";
import { guessBsPl } from "@/lib/mis/bs-pl";
import { fieldClass } from "@/lib/ui-classes";

import { BulkMappingForm } from "./bulk-mapping-form";
import { CELL, EditableRow } from "./editable-row";

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

const HEAD = "px-3 py-2 text-start text-label font-medium text-text-secondary first:ps-5 last:pe-5";

function MapTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div tabIndex={0} role="region" aria-label={label} className="scrollbar-thin relative overflow-x-auto border-t border-border focus-visible:-outline-offset-2">
      <table className="w-full min-w-max text-body">
        <thead>
          <tr className="border-b border-border bg-surface-raised">
            {["Ledger", "Classification", "Grouping", "B.S/P.L", "Section"].map((h) => (
              <th key={h} className={HEAD}>
                {h}
              </th>
            ))}
            <th className={HEAD}>
              <span className="sr-only">Save</span>
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function MappingManager({ entries, unmapped, groupings, templatedGroupings, slug }: {
  entries: MapEntry[];
  unmapped: UnmappedLedger[];
  groupings: string[];
  /** Groupings that already have an MIS Template line; see `EditableRow`. */
  templatedGroupings: Set<string>;
  slug: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return entries;
    return entries.filter((e) => e.ledger.toLowerCase().includes(n) || e.grouping.toLowerCase().includes(n));
  }, [entries, q]);
  const row = { groupings, templatedGroupings, slug };

  return (
    <div className="space-y-6">
      <BulkMappingForm slug={slug} />

      <Card flush title={`Unmapped ledgers${unmapped.length > 0 ? ` (${unmapped.length})` : ""}`} className="gap-4 pb-0">
        {unmapped.length === 0 ? (
          <p className="border-t border-border px-5 py-4 text-body text-text-secondary">
            No unmapped ledgers: every ledger in the latest Trial Balance is mapped.
          </p>
        ) : (
          <MapTable label="Unmapped ledgers">
            {unmapped.map((u) => (
              <EditableRow key={u.ledger} ledger={u.ledger} initialGrouping="" initialBsPl={guessBsPl(u.classification)} classification={u.classification} requireChoice {...row} />
            ))}
          </MapTable>
        )}
      </Card>

      <Card
        flush
        title={`Ledger map (${entries.length})`}
        actions={
          <div className="flex items-center gap-3">
            {/* Always mounted, so a screen reader hears each new count. */}
            <span role="status" aria-live="polite" className="text-label text-text-secondary">
              {q.trim() ? `${filtered.length} of ${entries.length} shown` : ""}
            </span>
            <label className="block">
              <span className="sr-only">Search the ledger map</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Rent" className={`${fieldClass} w-64`} />
            </label>
          </div>
        }
        className="gap-4 pb-0"
      >
        <MapTable label="Ledger map">
          {filtered.length === 0 && q.trim() ? (
            <tr>
              <td colSpan={6} className={`${CELL} py-6 text-center text-text-secondary`}>
                No ledgers match &lsquo;{q.trim()}&rsquo;.{" "}
                <button type="button" onClick={() => setQ("")} className="font-medium text-text-primary underline underline-offset-2 hover:no-underline">
                  Clear search
                </button>
              </td>
            </tr>
          ) : (
            filtered.map((e) => <EditableRow key={e.ledger} ledger={e.ledger} initialGrouping={e.grouping} initialBsPl={e.bsPl} classification={e.classification} {...row} />)
          )}
        </MapTable>
      </Card>
    </div>
  );
}
