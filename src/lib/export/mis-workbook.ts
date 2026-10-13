import "server-only";

import type ExcelJS from "exceljs";

import type { AgeingEntry, Company, Period } from "@/lib/data/mis";
import type { BookToBankResult } from "@/lib/mis/book-to-bank";
import type { CccResult } from "@/lib/mis/ccc";
import type { SegmentResult } from "@/lib/mis/segment";
import type { MasterRow, PnlResult, StatementLine } from "@/lib/mis/types";

import {
  addSheet,
  AMBER,
  COL0,
  DAYS_FMT,
  MONEY_FMT,
  RATIO_BRACKET_FMT,
  RATIO_FMT,
  monthHeader,
  setWidths,
  titleBlock,
  writeRow,
  type HeaderGroup,
} from "./workbook";

/** One month's computed statements. */
export interface MonthData {
  period: Period;
  rows: MasterRow[];
  pnl: PnlResult;
  segment: SegmentResult;
  btb: BookToBankResult;
  ccc: CccResult;
}

export interface WorkbookInput {
  company: Company | null;
  /** Oldest first — the column order the reference workbook uses. */
  months: MonthData[];
  /** The month the export was requested for; ageing is its snapshot. */
  selected: Period;
  ytdLines: StatementLine[];
  debtors: AgeingEntry[];
  creditors: AgeingEntry[];
  fyLabel: string;
}

/** The reference writes FY labels as `FY26-27`, not `FY 2026-27`. */
export function compactFyLabel(fy: string): string {
  const m = fy.match(/(\d{2})(\d{2})-(\d{2})/);
  return m ? `FY${m[2]}-${m[3]}` : fy.replace(/\s/g, "");
}

/** Lines the reference shades amber, being figures a human typed. */
const MANUAL_KEYS = new Set(["closingStock", "depreciation", "interestExpense"]);

function kindFor(line: StatementLine): "normal" | "section" | "subtotal" | "highlight" | "total" {
  if (line.emphasis === "section") return "section";
  if (line.key === "ebitda") return "highlight";
  if (line.key === "ebt") return "total";
  if (line.emphasis === "subtotal" || line.emphasis === "total") return "subtotal";
  return "normal";
}

const periodRange = (i: WorkbookInput, sep: string) =>
  i.months.length > 0
    ? `${i.months[0].period.label} ${sep} ${i.months[i.months.length - 1].period.label}`
    : i.selected.label;

// ------------------------------------------------------------------ Cover
export function coverSheet(wb: ExcelJS.Workbook, i: WorkbookInput): void {
  const ws = addSheet(wb, "Cover Page");
  for (let c = 1; c <= 8; c++) ws.getColumn(c).width = 15;

  const line = (row: number, text: string, size: number, opts: Partial<ExcelJS.Font> = {}) => {
    ws.mergeCells(row, 1, row, 8);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { name: "Calibri", size, color: { argb: "FF1F4E78" }, ...opts };
    ws.getRow(row).height = 24.95;
  };

  line(7, i.company?.name ?? "Especia MIS", 22, { bold: true });
  line(9, "Report on", 16, { bold: true });
  line(11, "Management Information System", 20);
  line(13, periodRange(i, "to"), 14, { italic: true });
  line(14, `(${i.fyLabel})`, 14, { italic: true });
  line(20, "Especia Associates LLP", 14, { bold: true });

  const address: [number, string][] = [
    [21, "Suite No.206, Second Floor, H 161"],
    [22, "BSI Business Park, H Block"],
    [23, "Sector 63 Noida, Uttar Pradesh 201301"],
    [24, "Mobile No: 8920207749"],
    [25, "Email id: rounak@especia.co.in"],
  ];
  for (const [row, text] of address) {
    line(row, text, 11, { italic: true, color: { argb: "FF595959" } });
  }
}

// ---------------------------------------------------------------- Summary
export function summarySheet(wb: ExcelJS.Workbook, i: WorkbookInput): void {
  const ws = addSheet(wb, "Summary");
  setWidths(ws, [26, ...i.months.map(() => 16)]);

  let r = titleBlock(ws, "Topic: MIS Highlights", `Month: ${periodRange(i, "-")}`);
  writeRow(ws, r, ["Profit & Loss Summary"], [], "section");
  r += 2;

  const groups: HeaderGroup[] = i.months.map((m) => ({ label: m.period.label, cols: [] }));
  r = monthHeader(ws, r, ["Heads"], groups);

  const t = (m: MonthData) => m.pnl.totals;
  const pct = (n: number, d: number) => (d ? n / d : 0);
  const lines: [string, (m: MonthData) => number, string, boolean?][] = [
    ["Sales", (m) => t(m).revenue, MONEY_FMT, true],
    ["COGS", (m) => t(m).cogs, MONEY_FMT],
    ["COGS %", (m) => pct(t(m).cogs, t(m).revenue), RATIO_FMT],
    ["GP", (m) => t(m).grossProfit, MONEY_FMT, true],
    ["GP %", (m) => pct(t(m).grossProfit, t(m).revenue), RATIO_FMT],
    ["Indirect Income", (m) => t(m).indirectIncome, MONEY_FMT],
    ["Fixed Cost", (m) => t(m).indirectExpense, MONEY_FMT],
    ["NP", (m) => t(m).ebt, MONEY_FMT, true],
    ["NP %", (m) => pct(t(m).ebt, t(m).revenue), RATIO_FMT],
  ];
  for (const [label, get, fmt, strong] of lines) {
    writeRow(
      ws,
      r++,
      [label],
      i.months.map(get),
      strong ? "subtotal" : "normal",
      i.months.map(() => fmt),
    );
  }

  r += 2;
  writeRow(ws, r, ["Balance sheet Summary"], [], "section");
  r += 2;
  r = monthHeader(ws, r, ["Heads"], groups);

  const bs: [string, (m: MonthData) => number, string][] = [
    ["Sundry Debtors", (m) => m.ccc.closingDebtors, MONEY_FMT],
    ["Sundry Creditors", (m) => m.ccc.closingCreditors, MONEY_FMT],
    ["Inventory", (m) => m.ccc.closingInventory, MONEY_FMT],
    ["Cash, Bank & OD", (m) => m.btb.closingCash, MONEY_FMT],
    ["CCC (Days)", (m) => m.ccc.ccc, DAYS_FMT],
  ];
  for (const [label, get, fmt] of bs) {
    writeRow(
      ws,
      r++,
      [label],
      i.months.map(get),
      "normal",
      i.months.map(() => fmt),
    );
  }
}

// -------------------------------------------------------------------- P&L
export function pnlSheet(wb: ExcelJS.Workbook, i: WorkbookInput): void {
  const ws = addSheet(wb, "P&L");
  setWidths(ws, [36, ...i.months.flatMap(() => [16, 16]), 16, 16]);

  let r = titleBlock(ws, "Subject- Profit Statement", `Month: ${i.fyLabel}`);
  const groups: HeaderGroup[] = [
    ...i.months.map((m) => ({ label: m.period.label, cols: [m.period.label, "Ratios"] })),
    { label: `YTD (${i.fyLabel})`, cols: ["YTD", "Ratios"], ytd: true },
  ];
  r = monthHeader(ws, r, ["Particular"], groups);

  // Row order follows the first month; a ledger that only appears later is
  // appended rather than dropped.
  const order: StatementLine[] = [];
  const seen = new Set<string>();
  for (const m of i.months) {
    for (const l of m.pnl.lines) {
      if (!seen.has(l.key)) {
        seen.add(l.key);
        order.push(l);
      }
    }
  }

  const byKey: Map<string, StatementLine>[] = i.months.map(
    (m) => new Map(m.pnl.lines.map((l: StatementLine) => [l.key, l])),
  );
  const ytdByKey = new Map(i.ytdLines.map((l) => [l.key, l]));

  for (const proto of order) {
    const isSection = proto.emphasis === "section";
    const values: (number | null)[] = [];
    const formats: string[] = [];
    for (const map of byKey) {
      const line = map.get(proto.key);
      values.push(isSection ? null : (line?.value ?? 0));
      formats.push(MONEY_FMT);
      values.push(isSection ? null : (line?.ratio ?? 0));
      formats.push(RATIO_FMT);
    }
    const y = ytdByKey.get(proto.key);
    values.push(isSection ? null : (y?.value ?? 0), isSection ? null : (y?.ratio ?? 0));
    formats.push(MONEY_FMT, RATIO_FMT);

    writeRow(ws, r, [proto.label], values, kindFor(proto), formats);

    // Amber marks the figures a human typed on the Adjustments screen.
    if (MANUAL_KEYS.has(proto.key)) {
      for (let c = 0; c < values.length; c += 2) {
        ws.getCell(r, COL0 + 1 + c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: AMBER },
        };
      }
    }
    r++;
  }
}

// ----------------------------------------------------------- Segment wise
export function segmentSheet(wb: ExcelJS.Workbook, i: WorkbookInput): void {
  const ws = addSheet(wb, "Segment wise PL");
  setWidths(ws, [30, ...i.months.flatMap(() => [18, 18, 18, 18])]);

  let r = titleBlock(ws, "Subject- Segment-wise Profit Statement", `Period: ${i.fyLabel}`);
  const names = i.months[0]?.segment.segments.map((s) => s.name) ?? [];
  r = monthHeader(
    ws,
    r,
    ["Particulars"],
    i.months.map((m) => ({ label: m.period.label, cols: [...names, "Total"] })),
  );

  type Seg = SegmentResult["segments"][number];
  const line = (
    label: string,
    get: (s: Seg) => number,
    total: (m: MonthData) => number,
    kind: "normal" | "subtotal" = "normal",
    fmt = MONEY_FMT,
  ) => {
    const values = i.months.flatMap((m) => [...m.segment.segments.map(get), total(m)]);
    writeRow(
      ws,
      r++,
      [label],
      values,
      kind,
      values.map(() => fmt),
    );
  };

  line("Revenue From Operations", (s) => s.revenue, (m) => m.segment.total.revenue, "subtotal");
  line("Opening Stock", (s) => s.openingStock, (m) => m.segment.total.openingStock);
  line("Total Purchase", (s) => s.purchase, (m) => m.segment.total.purchase);
  line("Closing Stock", (s) => s.closingStock, (m) => m.segment.total.closingStock);
  line("Net Consumption", (s) => s.netConsumption, (m) => m.segment.total.netConsumption);
  line("Rent Expense", (s) => s.rent, (m) => m.segment.total.rent);
  line("Loading & Unloading Expenses", (s) => s.loading, (m) => m.segment.total.loading);
  line("COGS", (s) => s.cogs, (m) => m.segment.total.cogs, "subtotal");
  line("Gross Profit", (s) => s.grossProfit, (m) => m.segment.total.grossProfit, "subtotal");
  line("Gross Profit %", (s) => s.gpPct, (m) => m.segment.total.gpPct, "normal", RATIO_FMT);
}

// ------------------------------------------------------------ Book to Bank
export function bookToBankSheet(wb: ExcelJS.Workbook, i: WorkbookInput): void {
  const ws = addSheet(wb, "Book to Bank");
  setWidths(ws, [5, 50, ...i.months.map(() => 18), 18]);

  let r = titleBlock(ws, "Subject- Cash Flow Statement", `Period: ${i.fyLabel}`);
  r = monthHeader(ws, r, ["", "Particulars"], [
    ...i.months.map((m) => ({ label: m.period.label, cols: [] })),
    { label: `YTD (${i.fyLabel})`, cols: [], ytd: true },
  ]);

  const row = (
    num: string,
    label: string,
    get: (b: BookToBankResult) => number,
    kind: "normal" | "subtotal" | "highlight" = "normal",
  ) => {
    const vals = i.months.map((m) => get(m.btb));
    // A cash-flow line is a flow, so YTD is the sum of the months.
    writeRow(ws, r++, [num, label], [...vals, vals.reduce((a, v) => a + v, 0)], kind);
  };

  writeRow(ws, r++, ["", "Summary"], [], "section");
  row("I", "Profit/(Loss) For the period", (b) => b.profit);
  row("", "Working Capital (Increase)/Decrease", (b) => b.workingCapitalChange);
  row("", "Operating Profit Available", (b) => b.operatingProfitAvailable, "highlight");
  row("II", "Loan (Decrease)/Increase", (b) => b.loanChange);
  row("III", "Fixed Asset (Increase)/Decrease", (b) => b.fixedAssetChange);
  row("", "Withdrawable Cash", (b) => b.withdrawableCash, "highlight");
  r++;

  // Balances, not flows — the YTD column takes the closing position instead.
  const balance = (label: string, get: (b: BookToBankResult) => number) => {
    const vals = i.months.map((m) => get(m.btb));
    writeRow(ws, r++, ["", label], [...vals, vals[vals.length - 1] ?? 0]);
  };
  balance("Opening Balance of Cash, Bank & OD", (b) => b.openingCash);
  balance("Closing Balance of Cash, Bank & OD", (b) => b.closingCash);
  balance("Difference", (b) => b.difference);

  r++;
  writeRow(ws, r++, ["", "Detail of Working Capital changes:"], [], "section");
  for (const item of i.months[0]?.btb.currentLiabilities ?? []) {
    const vals = i.months.map(
      (m) => m.btb.currentLiabilities.find((x) => x.key === item.key)?.value ?? 0,
    );
    writeRow(ws, r++, ["", item.label], [...vals, vals.reduce((a, v) => a + v, 0)]);
  }
  for (const item of i.months[0]?.btb.currentAssets ?? []) {
    const vals = i.months.map(
      (m) => m.btb.currentAssets.find((x) => x.key === item.key)?.value ?? 0,
    );
    writeRow(ws, r++, ["", item.label], [...vals, vals.reduce((a, v) => a + v, 0)]);
  }

  r++;
  writeRow(ws, r++, ["", "Detail of Fixed Asset changes:"], [], "section");
  for (const [label, get] of [
    ["Purchase of fixed assets", (b: BookToBankResult) => b.faPurchase],
    ["Sale of fixed assets", (b: BookToBankResult) => b.faSale],
  ] as const) {
    const vals = i.months.map((m) => get(m.btb));
    writeRow(ws, r++, ["", label], [...vals, vals.reduce((a, v) => a + v, 0)]);
  }
}

// -------------------------------------------------------------------- CCC
export function cccSheet(wb: ExcelJS.Workbook, i: WorkbookInput): void {
  const ws = addSheet(wb, "CCC");
  setWidths(ws, [5, 45, ...i.months.map(() => 14), 14]);

  let r = titleBlock(
    ws,
    `Subject - Cash Conversion Cycle (${i.fyLabel}) · 365-day basis · annualised`,
    `Period: ${i.fyLabel}`,
  );
  r = monthHeader(ws, r, ["", "Particulars"], [
    ...i.months.map((m) => ({ label: m.period.label, cols: [] })),
    { label: "YTD", cols: [], ytd: true },
  ]);

  // Ratios are not flows, so the YTD column carries the latest month rather
  // than a sum — summing turnover ratios would be meaningless.
  const latest = (get: (c: CccResult) => number) =>
    i.months.length ? get(i.months[i.months.length - 1].ccc) : 0;

  const row = (num: string, label: string, get: (c: CccResult) => number, fmt: string) => {
    const vals = i.months.map((m) => get(m.ccc));
    writeRow(ws, r++, [num, label], [...vals, latest(get)], "normal", [...vals, 0].map(() => fmt));
  };

  row("I", "Debtors Turnover", (c) => c.debtorTurnover, RATIO_BRACKET_FMT);
  row("", "Debtors Collection Period (Days)", (c) => c.dcp, DAYS_FMT);
  row("II", "Inventory Turnover", (c) => c.inventoryTurnover, RATIO_BRACKET_FMT);
  row("", "Inventory Conversion Period (Days)", (c) => c.icp, DAYS_FMT);
  row("III", "Creditors Turnover", (c) => c.creditorTurnover, RATIO_BRACKET_FMT);
  row("", "Creditors Payment Period (Days)", (c) => c.cpp, DAYS_FMT);
  r++;

  const ccVals = i.months.map((m) => m.ccc.ccc);
  writeRow(
    ws,
    r,
    ["IV", "Cash Conversion Cycle (Days)"],
    [...ccVals, latest((c) => c.ccc)],
    "subtotal",
    [...ccVals, 0].map(() => DAYS_FMT),
  );
}

// -------------------------------------------------------------- Master_TB
export function masterSheet(wb: ExcelJS.Workbook, i: WorkbookInput): void {
  const ws = addSheet(wb, "Master_TB");
  setWidths(ws, [32, 9, 50, 22, ...i.months.flatMap(() => [14, 14, 14, 14, 14])]);

  let r = monthHeader(
    ws,
    1,
    ["Grouping", "B.S/P.L", "Particulars", "Classification"],
    i.months.map((m) => ({
      label: m.period.label,
      cols: ["Opening", "Debit", "Credit", "Closing", "Difference"],
    })),
  );

  // Ledgers can differ month to month, so the row set is the union — keyed by
  // particulars, the same identity the ledger map and the edit log use.
  const perMonth = i.months.map((m) => new Map(m.rows.map((row) => [row.particulars, row])));
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const m of i.months) {
    for (const row of m.rows) {
      if (!seen.has(row.particulars)) {
        seen.add(row.particulars);
        keys.push(row.particulars);
      }
    }
  }

  for (const key of keys) {
    const first = perMonth.map((mm) => mm.get(key)).find(Boolean);
    if (!first) continue;
    const values: (number | null)[] = [];
    for (const mm of perMonth) {
      const row = mm.get(key);
      if (!row) {
        values.push(null, null, null, null, null);
        continue;
      }
      // The reference carries this self-check column — the same identity the
      // editable Master Data screen flags on screen.
      const diff = row.opening + row.debit - row.credit - row.closing;
      values.push(row.opening, row.debit, row.credit, row.closing, diff);
    }
    writeRow(ws, r++, [first.grouping, first.bsPl, first.particulars, first.classification], values);
  }

  r++;
  const totals: number[] = [];
  for (const mm of perMonth) {
    const list = [...mm.values()];
    const sum = (get: (x: MasterRow) => number) => list.reduce((a, x) => a + get(x), 0);
    totals.push(
      sum((x) => x.opening),
      sum((x) => x.debit),
      sum((x) => x.credit),
      sum((x) => x.closing),
      sum((x) => x.opening + x.debit - x.credit - x.closing),
    );
  }
  writeRow(ws, r, ["TOTAL", "", "", ""], totals, "subtotal");
}

// ----------------------------------------------------------------- Ageing
export function ageingSheet(
  wb: ExcelJS.Workbook,
  name: string,
  noun: string,
  rows: AgeingEntry[],
  asAt: string,
): void {
  const ws = addSheet(wb, name);
  setWidths(ws, [48, 15, 15, 15, 15, 15, 15]);

  const title = ws.getCell(1, COL0);
  title.value = `${noun} Ageing — as at ${asAt}`;
  title.font = { name: "Calibri", bold: true, size: 12, color: { argb: "FF1F4E78" } };
  ws.mergeCells(1, COL0, 1, COL0 + 6);
  ws.getRow(1).height = 17.25;

  let r = monthHeader(ws, 3, [noun], [
    { label: "0-30", cols: [] },
    { label: "30-60", cols: [] },
    { label: "60-90", cols: [] },
    { label: "90-180", cols: [] },
    { label: "More than 180", cols: [] },
    { label: "Total Pending", cols: [] },
  ]);

  for (const x of rows) {
    writeRow(ws, r++, [x.party], [x.b0_30, x.b30_60, x.b60_90, x.b90_180, x.b180_plus, x.total]);
  }

  const sum = (get: (x: AgeingEntry) => number) => rows.reduce((a, x) => a + get(x), 0);
  writeRow(
    ws,
    r,
    ["Grand Total"],
    [
      sum((x) => x.b0_30),
      sum((x) => x.b30_60),
      sum((x) => x.b60_90),
      sum((x) => x.b90_180),
      sum((x) => x.b180_plus),
      sum((x) => x.total),
    ],
    "subtotal",
  );
}
