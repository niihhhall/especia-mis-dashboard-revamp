import { getFmtAmount } from "@/lib/data/unit";
import type { CccResult } from "@/lib/mis/ccc";

/** One month (or the YTD roll-up) as a column of the sheet. */
export interface CccColumn {
  key: string;
  label: string;
  c: CccResult;
}

type Fmt = "money" | "ratio" | "days" | "count";

interface CccRow {
  key: string;
  label: string;
  numeral?: string;
  get: (c: CccResult) => number;
  fmt: Fmt;
  emphasis?: "section" | "subtotal" | "total";
  italic?: boolean;
}

const fmtCell = (v: number, fmt: Fmt, money: (v: number) => string): string => {
  switch (fmt) {
    case "money":
      return money(v);
    case "ratio":
      return v.toFixed(2);
    case "count":
      return String(v);
    case "days":
    default:
      return `${v}d`;
  }
};

/**
 * One "Particulars"-style sheet: a fixed row spec rendered across every FY
 * month plus YTD, mirroring the reference workbook's own CCC sheet layout —
 * used for both the headline ratio block and the "Working Sheet" detail.
 */
function CccSheet({
  title,
  rows,
  columns,
  money,
}: {
  title?: string;
  rows: CccRow[];
  columns: CccColumn[];
  money: (v: number) => string;
}) {
  return (
    <div tabIndex={0} role="region" aria-label={title ?? "Cash conversion"} className="scrollbar-thin overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <table className="tbl-report tbl-frozen" style={{ minWidth: `${300 + columns.length * 130}px` }}>
        {title && (
          <caption className="border-b border-border bg-muted/40 px-4 py-2 text-start text-sm font-semibold text-foreground">
            {title}
          </caption>
        )}
        <thead>
          <tr>
            <th style={{ width: 28 }}>
              <span className="sr-only">Ref.</span>
            </th>
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
                  <td colSpan={2 + columns.length}>{row.label}</td>
                </tr>
              );
            }
            const rowClass =
              row.emphasis === "total" ? "row-tot" : row.emphasis === "subtotal" ? "row-sub" : "";
            return (
              <tr key={row.key} className={rowClass}>
                <td className="text-muted-foreground">{row.numeral ?? ""}</td>
                <td className={row.italic ? "italic text-muted-foreground" : ""}>{row.label}</td>
                {columns.map((c) => {
                  const v = row.get(c.c);
                  const negative = row.fmt !== "count" && v < 0;
                  return (
                    <td key={c.key} className={`nums${negative ? " neg" : ""}`}>
                      {fmtCell(v, row.fmt, money)}
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

const SUMMARY_ROWS: CccRow[] = [
  { key: "dt", numeral: "I", label: "Debtors Turnover (Ann Sales / Avg Debtor)", get: (c) => c.debtorTurnover, fmt: "ratio" },
  { key: "dcp", label: "Debtors Collection Period (Days) = 365/TR", get: (c) => c.dcp, fmt: "days", italic: true },
  { key: "it", numeral: "II", label: "Inventory Turnover (Ann COGS / Avg Inv)", get: (c) => c.inventoryTurnover, fmt: "ratio" },
  { key: "icp", label: "Inventory Conversion Period (Days) = 365/TR", get: (c) => c.icp, fmt: "days", italic: true },
  { key: "ct", numeral: "III", label: "Creditors Turnover (Ann Purch / Avg Cred)", get: (c) => c.creditorTurnover, fmt: "ratio" },
  { key: "cpp", label: "Creditors Payment Period (Days) = 365/TR", get: (c) => c.cpp, fmt: "days", italic: true },
  { key: "ccc", numeral: "IV", label: "Cash Conversion Cycle (Days)", get: (c) => c.ccc, fmt: "days", emphasis: "total" },
];

const WORKING_ROWS: CccRow[] = [
  { key: "od", label: "Opening Debtor (1-Apr)", get: (c) => c.openingDebtors, fmt: "money" },
  { key: "cd", label: "Closing Debtor (current)", get: (c) => c.closingDebtors, fmt: "money" },
  { key: "ad", label: "Average Debtor", get: (c) => c.avgDebtors, fmt: "money", emphasis: "subtotal" },
  { key: "oc", label: "Opening Creditor (1-Apr)", get: (c) => c.openingCreditors, fmt: "money" },
  { key: "cc", label: "Closing Creditor (current)", get: (c) => c.closingCreditors, fmt: "money" },
  { key: "ac", label: "Average Creditors", get: (c) => c.avgCreditors, fmt: "money", emphasis: "subtotal" },
  { key: "oi", label: "Opening Inventory (1-Apr)", get: (c) => c.openingInventory, fmt: "money" },
  { key: "ci", label: "Closing Inventory (current)", get: (c) => c.closingInventory, fmt: "money" },
  { key: "ai", label: "Average Inventory", get: (c) => c.avgInventory, fmt: "money", emphasis: "subtotal" },
  { key: "mn", label: "Month number (n)", get: (c) => c.monthNumber, fmt: "count" },
  { key: "sm", label: "Sales — Monthly", get: (c) => c.revenue, fmt: "money" },
  { key: "sy", label: "Sales — Running (YTD)", get: (c) => c.ytdRevenue, fmt: "money" },
  { key: "sa", label: "Sales — Annualised", get: (c) => c.annualisedRevenue, fmt: "money", emphasis: "subtotal" },
  { key: "pm", label: "Purchase — Monthly", get: (c) => c.purchases, fmt: "money" },
  { key: "py", label: "Purchase — Running (YTD)", get: (c) => c.ytdPurchases, fmt: "money" },
  { key: "pa", label: "Purchase — Annualised", get: (c) => c.annualisedPurchases, fmt: "money", emphasis: "subtotal" },
  { key: "com", label: "COGS — Monthly", get: (c) => c.cogs, fmt: "money" },
  { key: "coy", label: "COGS — Running (YTD)", get: (c) => c.ytdCogs, fmt: "money" },
  { key: "coa", label: "COGS — Annualised", get: (c) => c.annualisedCogs, fmt: "money", emphasis: "subtotal" },
];

/**
 * The full CCC sheet, FY-wide: the headline ratio block (matching the
 * reference workbook's left-hand "Particulars" table) plus the "Working
 * Sheet" detail (its right-hand block) — every intermediate figure a formula
 * audit needs, laid out the same way as the source MIS.
 */
export async function CccTable({ columns }: { columns: CccColumn[] }) {
  const money = await getFmtAmount();
  return (
    <div className="space-y-6">
      <CccSheet rows={SUMMARY_ROWS} columns={columns} money={money} />
      <CccSheet title="Working Sheet" rows={WORKING_ROWS} columns={columns} money={money} />
    </div>
  );
}
