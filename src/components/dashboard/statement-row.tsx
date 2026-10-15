import { cn } from "@/lib/utils";
import type { StatementRowData } from "@/types/statement";

const KIND_ROW: Record<NonNullable<StatementRowData["kind"]>, string> = {
  line: "",
  section: "font-semibold text-text-primary",
  subtotal: "border-t border-border-strong font-semibold",
  total: "border-y border-border-strong font-semibold",
};

/**
 * One statement row. The label cell is frozen (opaque, with a 1px end edge)
 * so it stays put while the value columns scroll beneath it. withRef adds the
 * table's leading reference cell, frozen with it.
 */
export function StatementRow({ row, withRef = false }: { row: StatementRowData; withRef?: boolean }) {
  const kind = row.kind ?? "line";
  return (
    <tr
      className={cn(
        "group border-b border-border text-body text-text-primary transition-colors hover:bg-surface-raised",
        KIND_ROW[kind],
        row.separator && "border-t border-t-border-strong",
      )}
    >
      {withRef && (
        <td className="sticky start-0 z-10 w-12 min-w-12 bg-surface py-2 ps-5 text-text-secondary transition-colors group-hover:bg-surface-raised">
          {row.ref ?? ""}
        </td>
      )}
      <th
        scope="row"
        className={cn(
          "sticky z-10 bg-surface py-2 pe-3 text-start font-medium transition-colors group-hover:bg-surface-raised",
          "after:absolute after:inset-y-0 after:end-0 after:w-px after:bg-border",
          withRef ? "start-12 ps-3" : "start-0 ps-5",
          row.quiet && "font-normal italic text-text-secondary",
          kind === "section" && "pt-5 font-semibold",
          kind !== "line" && "font-semibold",
        )}
      >
        {row.label}
      </th>
      {row.cells.map((cell, i) => (
        <td
          key={i}
          className={cn("num px-3 py-2 last:pe-5", kind === "section" && "pt-5", cell.muted && "text-text-secondary")}
        >
          {cell.text}
          {cell.sub ? (
            <span className="block text-label font-normal text-text-secondary">{cell.sub}</span>
          ) : null}
        </td>
      ))}
    </tr>
  );
}
