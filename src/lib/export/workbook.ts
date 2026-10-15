import "server-only";

import ExcelJS from "exceljs";

/**
 * Shared vocabulary for building the MIS workbook.
 *
 * Every constant here was read out of the client's own workbook
 * (TIRUPATI_MIS_FY26_27v2.xlsx) rather than invented, so a generated pack looks
 * native to them: Calibri throughout, sheets starting at column B with A as a
 * 3-wide gutter, a two-line subject banner, and merged month labels above their
 * sub-columns.
 *
 * ExcelJS rather than SheetJS: the SheetJS community build silently drops
 * fonts, fills and borders on write, verified, so the reference look is
 * unreachable with it. SheetJS still parses uploads.
 */

// --- palette, straight from the reference workbook's styles.xml -------------
export const NAVY = "FF1F4E78"; // header bands, section banners
export const BLUE = "FF9BC2E6"; // month sub-header row; the EBT / check rows
export const GREEN_YTD = "FFC6E0B4"; // YTD column header: set apart from months
export const CREAM = "FFFFF2CC"; // subtotals
export const GREEN_SOFT = "FFC6EFCE"; // EBITDA / Operating Profit Available
export const AMBER = "FFFFE699"; // manual-input cells (closing stock, dep, interest)
const GRID = "FFB0B0B0";
const WHITE = "FFFFFFFF";

// --- number formats, also lifted verbatim -----------------------------------
/** Accounting money: negatives red with a minus, zero as a dash. */
export const MONEY_FMT = '_-* #,##0.00_-;[Red]\-* #,##0.00_-;_-* "-"_-';
/** 2dp percent, negative red, zero as a dash. */
export const RATIO_FMT = '0.00%;[Red]\-0.00%;"-"';
/** 2dp with negatives in brackets, used for turnover ratios. */
export const RATIO_BRACKET_FMT = '#,##0.00;[Red]\(#,##0.00\);"-"';
/** 0dp with negatives in brackets, used for day counts. */
export const DAYS_FMT = '#,##0;[Red]\(#,##0\);"-"';

// NOTE: the reference uses WESTERN thousands grouping (#,##0), not Indian
// lakh/crore, and no compact scaling. `format.ts` (en-IN, ₹ Cr/L) is for the
// screen only, writing its strings into cells would make figures non-numeric.

/** First data column. Column A is a 3-wide margin on every sheet. */
export const COL0 = 2;

export type Cell = string | number | null;

export function createWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Especia MIS";
  wb.created = new Date();
  return wb;
}

export function addSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  // Excel caps sheet names at 31 chars and forbids : \ / ? * [ ]
  return wb.addWorksheet(name.replace(/[:\/?*[\]]/g, "-").slice(0, 31));
}

const box = () => ({
  top: { style: "thin" as const, color: { argb: GRID } },
  left: { style: "thin" as const, color: { argb: GRID } },
  bottom: { style: "thin" as const, color: { argb: GRID } },
  right: { style: "thin" as const, color: { argb: GRID } },
});

const fill = (argb: string) =>
  ({ type: "pattern", pattern: "solid", fgColor: { argb } }) as ExcelJS.Fill;

/** The two-line banner: `Subject- <name>` then the period. Returns first free row. */
export function titleBlock(ws: ExcelJS.Worksheet, subject: string, period: string): number {
  const a = ws.getCell(1, COL0);
  a.value = subject;
  a.font = { name: "Calibri", bold: true, size: 12, color: { argb: NAVY } };
  ws.getRow(1).height = 15.75;

  const b = ws.getCell(2, COL0);
  b.value = period;
  b.font = { name: "Calibri", italic: true, size: 10, color: { argb: "FF595959" } };
  return 4; // row 3 stays blank, as in the reference
}

export interface HeaderGroup {
  label: string;
  /** Sub-column names. One entry = a single column under the label. */
  cols: string[];
  /** Renders green rather than navy, the reference marks YTD this way. */
  ytd?: boolean;
}

/**
 * Two-row header: merged group labels over their sub-columns, then the
 * sub-column names. `leadCols` are extra label columns before the groups
 * (e.g. the roman-numeral gutter on Book to Bank).
 *
 * Returns the first data row.
 */
export function monthHeader(
  ws: ExcelJS.Worksheet,
  startRow: number,
  leadCols: string[],
  groups: HeaderGroup[],
): number {
  const top = startRow;
  const bottom = startRow + 1;

  leadCols.forEach((label, i) => {
    const c = ws.getCell(top, COL0 + i);
    c.value = label;
    ws.mergeCells(top, COL0 + i, bottom, COL0 + i);
  });

  let col = COL0 + leadCols.length;
  for (const g of groups) {
    const span = Math.max(1, g.cols.length);
    const head = ws.getCell(top, col);
    head.value = g.label;
    if (span > 1) ws.mergeCells(top, col, top, col + span - 1);

    g.cols.forEach((sub, i) => {
      const c = ws.getCell(bottom, col + i);
      c.value = sub;
      if (g.ytd) c.fill = fill(GREEN_YTD);
    });
    if (g.cols.length === 0) ws.mergeCells(top, col, bottom, col);
    if (g.ytd) head.fill = fill(GREEN_YTD);
    col += span;
  }

  for (const row of [top, bottom]) {
    for (let i = COL0; i < col; i++) {
      const cell = ws.getCell(row, i);
      if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor?.argb !== GREEN_YTD) {
        cell.fill = fill(row === bottom ? BLUE : NAVY);
      }
      const onGreen = (cell.fill as ExcelJS.FillPattern).fgColor?.argb === GREEN_YTD;
      cell.font = {
        name: "Calibri",
        bold: true,
        size: 10,
        color: { argb: row === bottom || onGreen ? "FF1F2937" : WHITE },
      };
      cell.alignment = { horizontal: i < COL0 + leadCols.length ? "left" : "center", vertical: "middle" };
      cell.border = box();
    }
  }

  // Freeze the label columns and the header block, these sheets get wide once
  // a whole financial year is laid out side by side.
  ws.views = [{ state: "frozen", xSplit: COL0 + leadCols.length - 1, ySplit: bottom }];
  return bottom + 1;
}

export type RowKind = "normal" | "section" | "subtotal" | "total" | "highlight";

/** Write one statement row, banded to match the reference's row grammar. */
export function writeRow(
  ws: ExcelJS.Worksheet,
  row: number,
  labels: Cell[],
  values: Cell[],
  kind: RowKind = "normal",
  formats: (string | undefined)[] = [],
): void {
  labels.forEach((l, i) => {
    const c = ws.getCell(row, COL0 + i);
    c.value = l;
    c.alignment = { horizontal: "left" };
  });

  const dataStart = COL0 + labels.length;
  values.forEach((v, i) => {
    const cell = ws.getCell(row, dataStart + i);
    cell.value = v;
    cell.alignment = { horizontal: "right" };
    if (typeof v === "number") cell.numFmt = formats[i] ?? MONEY_FMT;
  });

  const width = labels.length + values.length;
  for (let i = 0; i < width; i++) {
    const cell = ws.getCell(row, COL0 + i);
    cell.border = box();
    const base = { name: "Calibri", size: 10 } as const;
    if (kind === "section") {
      cell.fill = fill(NAVY);
      cell.font = { ...base, bold: true, color: { argb: WHITE } };
    } else if (kind === "subtotal") {
      cell.fill = fill(CREAM);
      cell.font = { ...base, bold: true };
    } else if (kind === "highlight") {
      cell.fill = fill(GREEN_SOFT);
      cell.font = { ...base, bold: true };
    } else if (kind === "total") {
      cell.fill = fill(BLUE);
      cell.font = { ...base, bold: true, size: 11 };
    } else {
      cell.font = base;
    }
  }
}

/** Blank spacer row, the reference separates every logical block with one. */
export function spacer(row: number): number {
  return row + 1;
}

/** Column A is the 3-wide gutter; the rest are set explicitly per sheet. */
export function setWidths(ws: ExcelJS.Worksheet, widths: number[]): void {
  ws.getColumn(1).width = 3;
  widths.forEach((w, i) => {
    ws.getColumn(COL0 + i).width = w;
  });
}
