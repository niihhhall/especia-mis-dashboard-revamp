"use client";

import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import { Fragment, type ReactNode } from "react";

import { dataTableFeatures, type DataTableFeatures } from "@/components/dashboard/data-table-features";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

/**
 * An interactive list table on TanStack Table, drawn with the shadcn table
 * parts: 52px rows, a sticky header and a frozen first column inside one
 * focusable, labelled scroll region (the card body scrolls, so the header
 * sticks inside the card). `empty` replaces the rows when there are none.
 * Columns with a `footer` get a footer row. `renderExpanded` returns content
 * for a full-width row under a data row (an inline form), or null for none.
 */
export function DataTable<TData extends RowData>({
  label,
  columns,
  data,
  getRowId,
  empty,
  renderExpanded,
}: {
  label: string;
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  empty: ReactNode;
  renderExpanded?: (row: TData) => ReactNode;
}) {
  const table = useTable({ features: dataTableFeatures, columns, data, getRowId });
  const rows = table.getRowModel().rows;
  const hasFooter = columns.some((c) => c.footer);

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={label}
      className="scrollbar-thin relative max-h-[70dvh] overflow-auto focus-visible:-outline-offset-2"
    >
      <table className="w-full min-w-max border-collapse text-body">
        <TableHeader className="[&_tr]:border-b-0">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="border-b border-border hover:bg-transparent">
              {group.headers.map((header, i) => (
                <TableHead
                  key={header.id}
                  scope="col"
                  className={cn(
                    "sticky top-0 h-9 bg-surface-raised px-3 text-label text-text-secondary",
                    header.column.columnDef.meta?.align === "end" ? "text-end" : "text-start",
                    i === 0 ? "start-0 z-30 min-w-56 ps-5" : "z-20 min-w-28",
                    i === group.headers.length - 1 && "pe-5",
                  )}
                >
                  <table.FlexRender header={header} />
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="px-5 py-6 text-text-secondary">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const expanded = renderExpanded?.(row.original);
              return (
              <Fragment key={row.id}>
              <TableRow className="group h-13 border-b border-border hover:bg-surface-raised">
                {row.getAllCells().map((cell, i) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-3 py-0 text-text-primary",
                      cell.column.columnDef.meta?.align === "end" && "num",
                      i === 0 &&
                        "sticky start-0 z-10 bg-surface ps-5 font-medium transition-colors group-hover:bg-surface-raised after:absolute after:inset-y-0 after:end-0 after:w-px after:bg-border",
                      i === row.getAllCells().length - 1 && "pe-5",
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
              {expanded ? (
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="bg-surface-raised px-5 py-4 whitespace-normal">
                    {expanded}
                  </TableCell>
                </TableRow>
              ) : null}
              </Fragment>
              );
            })
          )}
        </TableBody>
        {hasFooter && rows.length > 0 && (
          <TableFooter className="bg-transparent">
            {table.getFooterGroups().map((group) => (
              <TableRow key={group.id} className="border-y border-border-strong hover:bg-transparent">
                {group.headers.map((header, i) => (
                  <TableCell
                    key={header.id}
                    className={cn(
                      "h-13 px-3 py-0 font-semibold text-text-primary",
                      header.column.columnDef.meta?.align === "end" && "num",
                      i === 0 && "sticky start-0 z-10 bg-surface ps-5",
                      i === group.headers.length - 1 && "pe-5",
                    )}
                  >
                    <table.FlexRender footer={header} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        )}
      </table>
    </div>
  );
}
