import { StatementRow } from "@/components/dashboard/statement-row";
import { cn } from "@/lib/utils";
import type { StatementColumn, StatementHeadGroup, StatementRowData } from "@/types/statement";

const HEAD = "sticky bg-surface-raised py-2 text-label font-medium text-text-secondary";

/**
 * A financial statement as a plain semantic table in a focusable, labelled
 * scroll region. The header sticks to the top of the region and the first
 * column stays frozen while the value columns scroll sideways.
 * `maxHeight="screen"` gives long statements their own vertical scroll so
 * the header has something to stick to. `refLabel` adds a narrow frozen
 * reference column before the labels; its header is read by screen readers
 * only. `groups` adds a header row above the columns (a group spanning one
 * column is that column's own header).
 */
export function StatementTable({
  label,
  firstColumnLabel,
  columns,
  rows,
  columnWidth = "md",
  maxHeight,
  refLabel,
  groups,
}: {
  label: string;
  firstColumnLabel: string;
  columns: StatementColumn[];
  rows: StatementRowData[];
  columnWidth?: "md" | "lg";
  maxHeight?: "screen";
  refLabel?: string;
  groups?: StatementHeadGroup[];
}) {
  const span = groups ? 2 : 1;
  const width = columnWidth === "lg" ? "min-w-32" : "min-w-28";
  // With groups, only the columns under a multi-column group go in the second row.
  let at = 0;
  const lower = groups?.flatMap((g) => {
    const cols = columns.slice(at, at + g.span);
    at += g.span;
    return g.span > 1 ? cols : [];
  });
  const valueHead = (key: string, text: string, extra?: { colSpan?: number; rowSpan?: number; top?: string }) => (
    <th
      key={key}
      scope={extra?.colSpan ? "colgroup" : "col"}
      colSpan={extra?.colSpan}
      rowSpan={extra?.rowSpan}
      className={cn(HEAD, extra?.top ?? "top-0", "z-20 px-3 text-end last:pe-5", !extra?.colSpan && width)}
    >
      {text}
    </th>
  );

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={label}
      className={cn(
        "scrollbar-thin relative overflow-x-auto focus-visible:-outline-offset-2",
        maxHeight === "screen" && "max-h-[70dvh] overflow-y-auto",
      )}
    >
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr>
            {refLabel !== undefined && (
              <th scope="col" rowSpan={span} className={cn(HEAD, "start-0 top-0 z-30 w-12 min-w-12 ps-5")}>
                <span className="sr-only">{refLabel}</span>
              </th>
            )}
            <th
              scope="col"
              rowSpan={span}
              className={cn(HEAD, "top-0 z-30 min-w-56 pe-3 text-start", refLabel !== undefined ? "start-12 ps-3" : "start-0 ps-5")}
            >
              {firstColumnLabel}
            </th>
            {groups
              ? groups.map((g, i) =>
                  g.span > 1
                    ? valueHead(`g${i}`, g.label, { colSpan: g.span })
                    : valueHead(`g${i}`, g.label, { rowSpan: 2 }),
                )
              : columns.map((c) => valueHead(c.key, c.label))}
          </tr>
          {lower && <tr>{lower.map((c) => valueHead(c.key, c.label, { top: "top-8" }))}</tr>}
        </thead>
        <tbody>
          {rows.map((r) => (
            <StatementRow key={r.key} row={r} withRef={refLabel !== undefined} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
