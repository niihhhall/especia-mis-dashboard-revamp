"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ageingColumns, type AgeingTotals } from "@/components/dashboard/ageing-columns";
import { DataTable } from "@/components/dashboard/data-table";
import { useFmtAmount } from "@/components/layout/unit-context";
import { Icon } from "@/components/shared/icon";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { Input } from "@/components/ui/input";
import type { AgeingEntry } from "@/lib/data/mis";

type Filter = "all" | "current" | "over90" | "over180";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All accounts" },
  { value: "current", label: "Has 0-30" },
  { value: "over90", label: "Above 90 days" },
  { value: "over180", label: "Above 180 days" },
];

const EMPTY_TOTALS: AgeingTotals = { b0_30: 0, b30_60: 0, b60_90: 0, b90_180: 0, b180_plus: 0, total: 0 };

/**
 * Party-level ageing with search and bucket filters, shared by the Debtors and
 * Creditors pages. The two differ only in label and which side they read.
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
      shown.reduce<AgeingTotals>(
        (a, r) => ({
          b0_30: a.b0_30 + r.b0_30,
          b30_60: a.b30_60 + r.b30_60,
          b60_90: a.b60_90 + r.b60_90,
          b90_180: a.b90_180 + r.b90_180,
          b180_plus: a.b180_plus + r.b180_plus,
          total: a.total + r.total,
        }),
        EMPTY_TOTALS,
      ),
    [shown],
  );
  const columns = useMemo(() => ageingColumns(noun, fmtAmount, totals), [noun, fmtAmount, totals]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-text-secondary">
            <Icon icon={Search} size={14} />
          </span>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Balaji Finance"
            aria-label={`Search ${noun}`}
            className="h-8 w-56 rounded-md border-border bg-surface ps-8 text-body"
          />
        </div>
        <SegmentedControl
          label="Filter by ageing bucket"
          options={FILTERS}
          value={filter}
          onChange={(v) => setFilter(v || "all")}
        />
        <span role="status" aria-live="polite" className="ms-auto text-label text-text-secondary">
          {shown.length === rows.length
            ? `${rows.length} shown`
            : `${shown.length} of ${rows.length} shown`}
        </span>
      </div>
      <DataTable
        label={`${noun} ageing`}
        columns={columns}
        data={shown}
        getRowId={(r) => r.party}
        empty={
          q.trim() ? (
            <>
              No accounts match &lsquo;{q.trim()}&rsquo;.{" "}
              <button
                type="button"
                onClick={() => setQ("")}
                className="font-medium text-text-primary underline underline-offset-2"
              >
                Clear search
              </button>
            </>
          ) : (
            "No accounts in this ageing bucket."
          )
        }
      />
    </div>
  );
}
