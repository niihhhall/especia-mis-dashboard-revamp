import "server-only";

import type ExcelJS from "exceljs";

import { UNIVERSAL_BUDGET_KEYS } from "../mis/budget";
import type { TemplateLine, TemplateSection } from "../mis/catalog";
import { AMBER, COL0, MONEY_FMT, addSheet, createWorkbook, setWidths } from "./workbook";

/**
 * The downloadable/re-uploadable Budget template — mirrors
 * `mapping-template-workbook.ts`'s shape (title + instructions + frozen
 * header + ExcelJS primitives for visual consistency), but one row per P&L
 * template line and one column per FY month, instead of one row per ledger.
 *
 * Column 1 (the 3-wide gutter every sheet reserves) carries each row's
 * stable `key`, hidden from view — re-upload matches rows by this key, not
 * by the visible Label text, so a CA relabeling a line doesn't break the
 * round trip.
 */

const PL_SECTIONS: { value: TemplateSection; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "purchase", label: "Purchase" },
  { value: "direct_expense", label: "Direct Expense" },
  { value: "indirect_income", label: "Indirect Income" },
  { value: "indirect_expense", label: "Indirect Expense" },
];

const UNIVERSAL_ROWS: { key: (typeof UNIVERSAL_BUDGET_KEYS)[number]; label: string }[] = [
  { key: "budgetOpeningStock", label: "Opening Stock" },
  { key: "budgetClosingStock", label: "Closing Stock" },
  { key: "budgetDepreciation", label: "Depreciation" },
  { key: "budgetInterestExpense", label: "Interest Expense" },
];

const NAVY = "FF1F4E78";
const HEADER_FILL = "FF1F4E78";

export interface BudgetTemplatePeriod {
  id: string;
  label: string;
}

export function buildBudgetTemplateWorkbook(
  companyName: string,
  template: TemplateLine[],
  periods: BudgetTemplatePeriod[],
  existing: Record<string, Record<string, number>>, // lineKey -> periodId -> amount
): ExcelJS.Workbook {
  const wb = createWorkbook();
  const ws = addSheet(wb, "Budget");

  ws.getCell(1, COL0).value = `Especia MIS — Budget Template — ${companyName}`;
  ws.getCell(1, COL0).font = { name: "Calibri", bold: true, size: 12, color: { argb: NAVY } };
  ws.getCell(2, COL0).value =
    "Fill in Budget figures below, then re-upload this same file on the Budget page. " +
    "Leave a cell blank to skip it — a blank cell will NOT overwrite a previously entered figure for that line/month.";
  ws.getCell(2, COL0).font = { name: "Calibri", italic: true, size: 10, color: { argb: "FF595959" } };
  ws.getCell(2, COL0).alignment = { wrapText: true };
  ws.mergeCells(2, COL0, 2, COL0 + 1 + periods.length);
  ws.getRow(2).height = 30;

  const headerRow = 4;
  const headers = ["Section", "Line", ...periods.map((p) => p.label)];
  headers.forEach((h, i) => {
    const c = ws.getCell(headerRow, COL0 + i);
    c.value = h;
    c.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.alignment = { horizontal: i < 2 ? "left" : "right", vertical: "middle" };
  });
  ws.views = [{ state: "frozen", xSplit: COL0 + 1 - 1, ySplit: headerRow }];

  const plLines = PL_SECTIONS.flatMap(({ value, label }) =>
    template.filter((l) => l.section === value).map((l) => ({ ...l, sectionLabel: label })),
  );

  let row = headerRow + 1;
  for (const line of plLines) {
    ws.getCell(row, 1).value = line.key; // hidden key column
    ws.getCell(row, COL0).value = line.sectionLabel;
    ws.getCell(row, COL0 + 1).value = line.label;
    periods.forEach((p, i) => {
      const cell = ws.getCell(row, COL0 + 2 + i);
      const v = existing[line.key]?.[p.id];
      if (v !== undefined) {
        cell.value = v;
        cell.numFmt = MONEY_FMT;
      }
    });
    row += 1;
  }

  for (const u of UNIVERSAL_ROWS) {
    ws.getCell(row, 1).value = u.key;
    ws.getCell(row, COL0).value = "Adjustments";
    ws.getCell(row, COL0 + 1).value = u.label;
    periods.forEach((p, i) => {
      const cell = ws.getCell(row, COL0 + 2 + i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER } };
      const v = existing[u.key]?.[p.id];
      if (v !== undefined) {
        cell.value = v;
        cell.numFmt = MONEY_FMT;
      }
    });
    row += 1;
  }

  ws.getColumn(1).hidden = true;
  setWidths(ws, [18, 26, ...periods.map(() => 14)]);
  return wb;
}
