"use client";

import type { DataTableColumn } from "@/components/dashboard/data-table";
import { StatusText } from "@/components/shared/status-text";
import { fmtAmount } from "@/lib/format";
import type { MasterRow } from "@/lib/mis/types";

import { AmountCell } from "./amount-cell";
import { EditableCell } from "./editable-cell";

export const FIELDS = ["opening", "debit", "credit", "closing"] as const;
export type Field = (typeof FIELDS)[number];
export type Totals = Record<Field, number>;

/** Tolerance for the accounting identity, in rupees. */
export const EPS = 0.01;

const LABEL: Record<Field, string> = { opening: "Opening", debit: "Debit", credit: "Credit", closing: "Closing" };

/**
 * The Master Data columns: four text columns, then the four editable figures.
 * Tally rows satisfy closing = opening + debit - credit (opening and closing
 * signed, debit and credit unsigned). An edit can break it, which is allowed,
 * but never silently: the row says "out of balance".
 */
export function masterColumns({
  totals,
  count,
  originals,
  onSaved,
  slug,
  branchId,
}: {
  totals: Totals;
  count: number;
  originals: Record<string, Partial<Record<Field, number>>>;
  onSaved: (particulars: string, field: Field, next: number) => void;
  slug: string;
  branchId: string | null;
}): DataTableColumn<MasterRow>[] {
  return [
    { id: "grouping", header: "Grouping", accessorFn: (r) => r.grouping, cell: (c) => c.getValue(), footer: () => `Total (${count})` },
    { id: "bsPl", header: "B.S/P.L", cell: ({ row: { original: r } }) => <span className="text-text-secondary">{r.bsPl}</span> },
    {
      id: "particulars",
      header: "Particulars",
      cell: ({ row: { original: r } }) => {
        const drift = r.opening + r.debit - r.credit - r.closing;
        return (
          <span className="whitespace-normal">
            {r.particulars}
            {r.unmapped && <StatusText className="ms-2">unmapped</StatusText>}
            {Math.abs(drift) > EPS && (
              <StatusText emphasis className="ms-2">
                <span title={`opening + debit \u2212 credit \u2212 closing = ${fmtAmount(drift)}`}>out of balance</span>
              </StatusText>
            )}
          </span>
        );
      },
    },
    { id: "classification", header: "Classification", cell: ({ row: { original: r } }) => <span className="text-text-secondary">{r.classification}</span> },
    ...FIELDS.map(
      (f): DataTableColumn<MasterRow> => ({
        id: f,
        header: LABEL[f],
        meta: { align: "end" },
        cell: ({ row: { original: r } }) => (
          <EditableCell
            particulars={r.particulars}
            field={f}
            value={r[f]}
            originalValue={originals[r.particulars]?.[f]}
            onSaved={(field, next) => onSaved(r.particulars, field as Field, next)}
            slug={slug}
            branchId={branchId}
          />
        ),
        footer: () => <AmountCell value={totals[f]} />,
      }),
    ),
  ];
}
