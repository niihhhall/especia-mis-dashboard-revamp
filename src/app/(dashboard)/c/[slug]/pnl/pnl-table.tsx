import { getFmtAmount } from "@/lib/data/unit";
import { fmtPct } from "@/lib/format";
import { mergeRows, sortIndirectExpenses } from "@/lib/mis/merge-rows";
import type { StatementLine } from "@/lib/mis/types";

/** One month (or the YTD roll-up) as a column of the statement. */
export interface PnlColumn {
  key: string;
  label: string;
  lines: StatementLine[];
}

const byKey = (lines: StatementLine[]) => Object.fromEntries(lines.map((l) => [l.key, l]));

/**
 * The statement as a navy-header analyst table, one column per month — the
 * %-of-revenue sits as a small line under the ₹ amount in the same cell
 * (not its own adjacent column), so more months stay visible side by side
 * without scrolling. `emphasis` maps onto `.tbl-report`'s row kinds:
 * section → row-grp, subtotal → row-sub, total → row-tot.
 */
export async function PnlTable({ columns }: { columns: PnlColumn[] }) {
  const fmtAmount = await getFmtAmount();
  const maps = columns.map((c) => byKey(c.lines));
  const lastMap = maps[maps.length - 1] ?? {};
  const rows = sortIndirectExpenses(mergeRows(columns), (key) => lastMap[key]?.value ?? 0);
  const colCount = 1 + columns.length;

  return (
    <div tabIndex={0} role="region" aria-label="P&L Detail" className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <table
        className="tbl-report tbl-frozen"
        style={{ minWidth: `${260 + columns.length * 110}px` }}
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
                      {line?.ratio !== undefined && (
                        <span className="pnl-pct">{fmtPct(line.ratio)}</span>
                      )}
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
