"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/dashboard/data-table";
import { Card } from "@/components/shared/card";
import { Icon } from "@/components/shared/icon";
import type { MasterEdit } from "@/lib/data/mis";
import { plural } from "@/lib/format";
import type { MasterRow } from "@/lib/mis/types";
import { fieldClass } from "@/lib/ui-classes";

import { EPS, masterColumns, type Field } from "./master-columns";
import { UnbalancedNotice } from "./unbalanced-notice";

export function MasterTable({
  rows,
  edits,
  slug,
  branchId,
}: {
  rows: MasterRow[];
  edits: MasterEdit[];
  slug: string;
  /** Which branch `rows` was fetched for (null for a legacy single-branch
   *  period). Passed straight through to every edit so it lands on the same
   *  row it was shown from. */
  branchId: string | null;
}) {
  const [q, setQ] = useState("");
  // Saved edits are mirrored locally so a cell and the totals update without a
  // full page round-trip; the server action still revalidates every report.
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<Field, number>>>>({});

  /** Earliest recorded old_value per cell = the original Tally figure. */
  const originals = useMemo(() => {
    const m: Record<string, Partial<Record<Field, number>>> = {};
    // getMasterEdits returns newest first, so the last one seen is the oldest.
    for (const e of edits) (m[e.particulars] ??= {})[e.field as Field] = e.old_value;
    return m;
  }, [edits]);

  const effective = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        opening: overrides[r.particulars]?.opening ?? r.opening,
        debit: overrides[r.particulars]?.debit ?? r.debit,
        credit: overrides[r.particulars]?.credit ?? r.credit,
        closing: overrides[r.particulars]?.closing ?? r.closing,
      })),
    [rows, overrides],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return effective;
    return effective.filter(
      (r) =>
        r.particulars.toLowerCase().includes(needle) ||
        r.grouping.toLowerCase().includes(needle) ||
        r.classification.toLowerCase().includes(needle),
    );
  }, [effective, q]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          acc.opening += r.opening;
          acc.debit += r.debit;
          acc.credit += r.credit;
          acc.closing += r.closing;
          return acc;
        },
        { opening: 0, debit: 0, credit: 0, closing: 0 },
      ),
    [filtered],
  );

  const unbalanced = filtered.filter((r) => Math.abs(r.opening + r.debit - r.credit - r.closing) > EPS).length;

  const columns = masterColumns({
    totals,
    count: filtered.length,
    originals,
    onSaved: (particulars, field, next) =>
      setOverrides((o) => ({ ...o, [particulars]: { ...o[particulars], [field]: next } })),
    slug,
    branchId,
  });

  return (
    <div className="space-y-6">
      <UnbalancedNotice count={unbalanced} />
      <Card
        flush
        subtitle="Click any figure, or Tab to it and press Enter, to edit it. Changes flow into every report immediately."
        actions={
          <span role="status" aria-live="polite" className="text-body text-text-secondary tabular-nums">
            {filtered.length === effective.length
              ? plural(filtered.length, "{n} row", "{n} rows")
              : `${filtered.length} of ${effective.length} rows`}
          </span>
        }
        className="pb-0"
      >
        <div className="border-b border-border px-5 pb-4">
          <label className="relative block w-72 max-w-full">
            <span className="sr-only">Search master data</span>
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-text-secondary">
              <Icon icon={Search} size={14} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ledger, grouping, classification…"
              className={`${fieldClass} w-full ps-8`}
            />
          </label>
        </div>
        <DataTable label="Master data trial balance" columns={columns} data={filtered} getRowId={(r) => `${r.particulars}|${r.grouping}|${r.classification}`} empty={null} />
      </Card>
    </div>
  );
}
