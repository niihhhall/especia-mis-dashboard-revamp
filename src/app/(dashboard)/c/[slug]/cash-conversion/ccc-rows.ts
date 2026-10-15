import { negParens } from "@/lib/format";
import type { CccResult } from "@/lib/mis/ccc";
import type { StatementColumn, StatementRowData } from "@/types/statement";

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
      return negParens(money(v));
    case "ratio":
      return v.toFixed(2);
    case "count":
      return String(v);
    case "days":
    default:
      return `${v}d`;
  }
};

/** The headline ratio block, matching the reference workbook's left-hand "Particulars" table. */
export const SUMMARY_ROWS: CccRow[] = [
  { key: "dt", numeral: "I", label: "Debtors turnover (ann sales / avg debtor)", get: (c) => c.debtorTurnover, fmt: "ratio" },
  { key: "dcp", label: "Debtors collection period (days) = 365/TR", get: (c) => c.dcp, fmt: "days", italic: true },
  { key: "it", numeral: "II", label: "Inventory turnover (ann COGS / avg inv)", get: (c) => c.inventoryTurnover, fmt: "ratio" },
  { key: "icp", label: "Inventory conversion period (days) = 365/TR", get: (c) => c.icp, fmt: "days", italic: true },
  { key: "ct", numeral: "III", label: "Creditors turnover (ann purch / avg cred)", get: (c) => c.creditorTurnover, fmt: "ratio" },
  { key: "cpp", label: "Creditors payment period (days) = 365/TR", get: (c) => c.cpp, fmt: "days", italic: true },
  { key: "ccc", numeral: "IV", label: "Cash conversion cycle (days)", get: (c) => c.ccc, fmt: "days", emphasis: "total" },
];

/** The "Working sheet" detail, the workbook's right-hand block: every intermediate figure. */
export const WORKING_ROWS: CccRow[] = [
  { key: "od", label: "Opening debtor (1-Apr)", get: (c) => c.openingDebtors, fmt: "money" },
  { key: "cd", label: "Closing debtor (current)", get: (c) => c.closingDebtors, fmt: "money" },
  { key: "ad", label: "Average debtor", get: (c) => c.avgDebtors, fmt: "money", emphasis: "subtotal" },
  { key: "oc", label: "Opening creditor (1-Apr)", get: (c) => c.openingCreditors, fmt: "money" },
  { key: "cc", label: "Closing creditor (current)", get: (c) => c.closingCreditors, fmt: "money" },
  { key: "ac", label: "Average creditors", get: (c) => c.avgCreditors, fmt: "money", emphasis: "subtotal" },
  { key: "oi", label: "Opening inventory (1-Apr)", get: (c) => c.openingInventory, fmt: "money" },
  { key: "ci", label: "Closing inventory (current)", get: (c) => c.closingInventory, fmt: "money" },
  { key: "ai", label: "Average inventory", get: (c) => c.avgInventory, fmt: "money", emphasis: "subtotal" },
  { key: "mn", label: "Month number (n)", get: (c) => c.monthNumber, fmt: "count" },
  { key: "sm", label: "Sales: Monthly", get: (c) => c.revenue, fmt: "money" },
  { key: "sy", label: "Sales: Running (YTD)", get: (c) => c.ytdRevenue, fmt: "money" },
  { key: "sa", label: "Sales: Annualised", get: (c) => c.annualisedRevenue, fmt: "money", emphasis: "subtotal" },
  { key: "pm", label: "Purchase: Monthly", get: (c) => c.purchases, fmt: "money" },
  { key: "py", label: "Purchase: Running (YTD)", get: (c) => c.ytdPurchases, fmt: "money" },
  { key: "pa", label: "Purchase: Annualised", get: (c) => c.annualisedPurchases, fmt: "money", emphasis: "subtotal" },
  { key: "com", label: "COGS: Monthly", get: (c) => c.cogs, fmt: "money" },
  { key: "coy", label: "COGS: Running (YTD)", get: (c) => c.ytdCogs, fmt: "money" },
  { key: "coa", label: "COGS: Annualised", get: (c) => c.annualisedCogs, fmt: "money", emphasis: "subtotal" },
];

/** The sheet's column heads. */
export const cccHead = (columns: CccColumn[]): StatementColumn[] => columns.map((c) => ({ key: c.key, label: c.label }));

/** A row spec rendered across every FY month plus YTD, as StatementTable rows. */
export function cccRows(spec: CccRow[], columns: CccColumn[], money: (v: number) => string): StatementRowData[] {
  return spec.map((row) => ({
    key: row.key,
    label: row.label,
    ref: row.numeral,
    quiet: row.italic,
    kind: row.emphasis ?? "line",
    cells:
      row.emphasis === "section"
        ? columns.map(() => ({ text: "" }))
        : columns.map((c) => {
            const v = row.get(c.c);
            return { text: fmtCell(v, row.fmt, money), negative: row.fmt !== "count" && v < 0 };
          }),
  }));
}
