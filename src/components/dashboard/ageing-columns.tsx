import type { DataTableColumn } from "@/components/dashboard/data-table";
import type { AgeingEntry } from "@/lib/data/mis";
import { negParens } from "@/lib/format";

export const BUCKETS = [
  { key: "b0_30", label: "0-30" },
  { key: "b30_60", label: "30-60" },
  { key: "b60_90", label: "60-90" },
  { key: "b90_180", label: "90-180" },
  { key: "b180_plus", label: "More than 180" },
] as const;

export type AgeingTotals = Record<(typeof BUCKETS)[number]["key"] | "total", number>;

/**
 * Columns for the party-level ageing: the party, five buckets and the total.
 * A zero bucket reads as a hyphen, as in the source export, because a column
 * of noughts hides the ones that matter. The footer is the total row.
 */
export function ageingColumns(
  noun: string,
  fmtAmount: (v: number) => string,
  totals: AgeingTotals,
): DataTableColumn<AgeingEntry>[] {
  const show = (v: number) => (v ? negParens(fmtAmount(v)) : "-");
  return [
    { id: "party", header: noun, accessorFn: (r) => r.party, cell: (c) => c.getValue(), footer: () => "Total" },
    ...BUCKETS.map(
      (b): DataTableColumn<AgeingEntry> => ({
        id: b.key,
        header: b.label,
        accessorFn: (r) => r[b.key],
        cell: (c) => show(c.getValue() as number),
        footer: () => show(totals[b.key]),
        meta: { align: "end" },
      }),
    ),
    {
      id: "total",
      header: "Total pending",
      accessorFn: (r) => r.total,
      cell: (c) => negParens(fmtAmount(c.getValue() as number)),
      footer: () => negParens(fmtAmount(totals.total)),
      meta: { align: "end" },
    },
  ];
}
