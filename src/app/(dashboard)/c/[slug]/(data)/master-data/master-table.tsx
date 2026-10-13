"use client";

import { useMemo, useState } from "react";

import { fmtAmount, plural } from "@/lib/format";
import type { MasterEdit } from "@/lib/data/mis";
import type { MasterRow } from "@/lib/mis/types";

import { fieldText, focusRing } from "@/lib/ui-classes";

import { EditableCell } from "./editable-cell";

const FIELDS = ["opening", "debit", "credit", "closing"] as const;
type Field = (typeof FIELDS)[number];

/** Tolerance for the accounting identity, in rupees. */
const EPS = 0.01;

function Amount({ value }: { value: number }) {
  return (
    <td className={`nums px-3 py-1.5 text-end ${value < 0 ? "text-danger" : ""}`}>
      {fmtAmount(value)}
    </td>
  );
}

export function MasterTable({
  rows,
  edits,
  slug,
  branchId,
}: {
  rows: MasterRow[];
  edits: MasterEdit[];
  slug: string;
  /** Which branch `rows` was fetched for — null for a legacy single-branch
   *  period. Passed straight through to every edit so it lands on the same
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
    for (const e of edits) {
      (m[e.particulars] ??= {})[e.field] = e.old_value;
    }
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

  const unbalanced = filtered.filter(
    (r) => Math.abs(r.opening + r.debit - r.credit - r.closing) > EPS,
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="block">
          <span className="sr-only">Search Master Data</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ledger, grouping, classification…"
            className={`w-72 rounded-md border border-border bg-card px-3 py-2 ${fieldText} ${focusRing}`}
          />
        </label>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {unbalanced > 0 && (
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning-text ring-1 ring-warning/30">
              {plural(unbalanced, "{n} row out of balance", "{n} rows out of balance")}
            </span>
          )}
          <span role="status" aria-live="polite">
            {filtered.length === effective.length
              ? plural(filtered.length, "{n} row", "{n} rows")
              : `${filtered.length} of ${effective.length} rows`}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click any figure, or Tab to it and press Enter, to edit it. Changes flow into every report
        immediately.
      </p>

      <div
        tabIndex={0}
        role="region"
        aria-label="Master Data trial balance"
        className={`overflow-x-auto rounded-xl border border-border bg-card ${focusRing}`}
      >
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-start text-overline uppercase text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Grouping</th>
              <th className="px-3 py-2 font-semibold">B.S/P.L</th>
              <th className="px-3 py-2 font-semibold">Particulars</th>
              <th className="px-3 py-2 font-semibold">Classification</th>
              <th className="px-3 py-2 text-end font-semibold">Opening</th>
              <th className="px-3 py-2 text-end font-semibold">Debit</th>
              <th className="px-3 py-2 text-end font-semibold">Credit</th>
              <th className="px-3 py-2 text-end font-semibold">Closing</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              // Tally rows satisfy closing = opening + debit − credit (opening and
              // closing signed, debit/credit unsigned). An edit can break it, which
              // is allowed — but never silently.
              const drift = r.opening + r.debit - r.credit - r.closing;
              const off = Math.abs(drift) > EPS;
              return (
                <tr
                  key={`${r.particulars}-${i}`}
                  className={`border-b border-border/60 last:border-0 ${off ? "bg-warning/5" : ""}`}
                >
                  <td className="px-3 py-1.5">{r.grouping}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.bsPl}</td>
                  <td className="px-3 py-1.5">
                    {r.particulars}
                    {r.unmapped && (
                      <span className="ms-2 rounded bg-danger/10 px-1.5 py-0.5 text-xs text-danger">
                        unmapped
                      </span>
                    )}
                    {off && (
                      <span
                        title={`opening + debit − credit − closing = ${fmtAmount(drift)}`}
                        className="ms-2 rounded bg-warning/15 px-1.5 py-0.5 text-xs text-warning-text"
                      >
                        out of balance
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.classification}</td>
                  {FIELDS.map((f) => (
                    <EditableCell
                      key={f}
                      particulars={r.particulars}
                      field={f}
                      value={r[f]}
                      originalValue={originals[r.particulars]?.[f]}
                      onSaved={(field, next) =>
                        setOverrides((o) => ({
                          ...o,
                          [r.particulars]: { ...o[r.particulars], [field]: next },
                        }))
                      }
                      slug={slug}
                      branchId={branchId}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-3 py-2" colSpan={4}>
                Total ({filtered.length})
              </td>
              <Amount value={totals.opening} />
              <Amount value={totals.debit} />
              <Amount value={totals.credit} />
              <Amount value={totals.closing} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
