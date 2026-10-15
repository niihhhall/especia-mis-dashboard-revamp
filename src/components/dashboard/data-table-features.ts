import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * The features every DataTable registers. Sorting is registered but no column
 * enables it yet (today's lists have fixed order), so headers stay plain text.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
  columnMeta: {} as { align?: "end" },
});

export type DataTableFeatures = typeof dataTableFeatures;
