import { getFmtAmount } from "@/lib/data/unit";
import { mergeRows } from "@/lib/mis/merge-rows";
import type { StatementLine } from "@/lib/mis/types";

/** One month (or the YTD roll-up) as a column of the statement. */
export interface BtbColumn {
  key: string;
  label: string;
  lines: StatementLine[];
}

const byKey = (lines: StatementLine[]) => Object.fromEntries(lines.map((l) => [l.key, l]));

/**
 * The Book to Bank statement laid out FY-wide, one ₹ column per month plus a
 * YTD roll-up — same grammar as the P&L Detail table (`PnlTable`), just
 * without the %-of-revenue sub-column: a cash-flow movement isn't naturally a
 * percentage of revenue the way a P&L line is.
 */
export async function BookToBankTable({ columns }: { columns: BtbColumn[] }) {
  const fmtAmount = await getFmtAmount();
  const rows = mergeRows(columns);
  const maps = columns.map((c) => byKey(c.lines));
  const colCount = 1 + columns.length;

  return (
    <div tabIndex={0} role="region" aria-label="Book to Bank" className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <table
        className="tbl-report tbl-frozen"
        style={{ minWidth: `${260 + columns.length * 120}px` }}
      >
        <thead>
          <tr>
            <th>Particulars</th>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.emphasis === "section") {
              return (
                <tr key={row.key} className="row-grp">
                  <td colSpan={colCount}>{row.label}</td>
                </tr>
              );
            }

            const rowClass =
              row.emphasis === "total" ? "row-tot" : row.emphasis === "subtotal" ? "row-sub" : "";

            return (
              <tr key={row.key} className={rowClass}>
                <td>{row.label}</td>
                {maps.map((m, i) => {
                  const line = m[row.key];
                  const negative = line !== undefined && line.value < 0 && !row.emphasis;
                  return (
                    <td key={columns[i].key} className={`nums${negative ? " neg" : ""}`}>
                      {line ? fmtAmount(line.value) : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
