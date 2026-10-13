"use client";

import { useMemo, useState } from "react";

import type { AgeingEntry } from "@/lib/data/mis";
import { useFmtAmount } from "@/components/layout/unit-context";

type Filter = "all" | "current" | "over90" | "over180";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All accounts" },
  { key: "current", label: "Has 0–30" },
  { key: "over90", label: "Above 90 days" },
  { key: "over180", label: "Above 180 days" },
];

const BUCKETS = [
  { key: "b0_30", label: "0–30" },
  { key: "b30_60", label: "30–60" },
  { key: "b60_90", label: "60–90" },
  { key: "b90_180", label: "90–180" },
  { key: "b180_plus", label: "More than 180" },
] as const;

/**
 * Party-level ageing with search and bucket filters, shared by the Debtors and
 * Creditors pages — the two differ only in label and which side they read.
 *
 * Filtering is client-side: a full ageing run is a few hundred rows, so shipping
 * them once and narrowing in the browser is faster than a round trip per keystroke.
 */
export function AgeingTable({ rows, noun }: { rows: AgeingEntry[]; noun: string }) {
  const fmtAmount = useFmtAmount();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.party.toLowerCase().includes(needle)) return false;
      if (filter === "current") return r.b0_30 !== 0;
      if (filter === "over90") return r.b90_180 !== 0 || r.b180_plus !== 0;
      if (filter === "over180") return r.b180_plus !== 0;
      return true;
    });
  }, [rows, q, filter]);

  const totals = useMemo(
    () =>
      shown.reduce(
        (a, r) => ({
          b0_30: a.b0_30 + r.b0_30,
          b30_60: a.b30_60 + r.b30_60,
          b60_90: a.b60_90 + r.b60_90,
          b90_180: a.b90_180 + r.b90_180,
          b180_plus: a.b180_plus + r.b180_plus,
          total: a.total + r.total,
        }),
        { b0_30: 0, b30_60: 0, b60_90: 0, b90_180: 0, b180_plus: 0, total: 0 },
      ),
    [shown],
  );

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Balaji Finance"
          aria-label={`Search ${noun}`}
          className="h-9 w-56 rounded-lg border border-border bg-muted/40 px-3 text-base text-foreground sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "brand-grad text-white"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span role="status" aria-live="polite" className="ms-auto text-xs text-muted-foreground">
          {shown.length === rows.length
            ? `${rows.length} shown`
            : `${shown.length} of ${rows.length} shown`}
        </span>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={`${noun} ageing`}
        className="scrollbar-thin overflow-x-auto px-4 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <table className="tbl-report tbl-frozen min-w-[820px]">
          <thead>
            <tr>
              <th>{noun}</th>
              {BUCKETS.map((b) => (
                <th key={b.key}>{b.label}</th>
              ))}
              <th>Total Pending</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  {q.trim() ? (
                    <>
                      No accounts match &lsquo;{q.trim()}&rsquo;.{" "}
                      <button
                        type="button"
                        onClick={() => setQ("")}
                        className="font-semibold text-primary underline underline-offset-2"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    "No accounts in this ageing bucket."
                  )}
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.party}>
                  <td>{r.party}</td>
                  {BUCKETS.map((b) => (
                    // A zero bucket reads as an em dash, as in the source export —
                    // a column of noughts hides the ones that matter.
                    <td key={b.key} className="nums">
                      {r[b.key] ? fmtAmount(r[b.key]) : "—"}
                    </td>
                  ))}
                  <td className="nums">{fmtAmount(r.total)}</td>
                </tr>
              ))
            )}
            {shown.length > 0 && (
              <tr className="row-tot">
                <td>Total</td>
                {BUCKETS.map((b) => (
                  <td key={b.key} className="nums">
                    {totals[b.key] ? fmtAmount(totals[b.key]) : "—"}
                  </td>
                ))}
                <td className="nums">{fmtAmount(totals.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
