import "server-only";

import type ExcelJS from "exceljs";

import { AMBER, COL0, addSheet, createWorkbook, setWidths } from "./workbook";

/**
 * The downloadable/re-uploadable bulk mapping-template workbook, a much
 * simpler sheet than `mis-workbook.ts`'s statement packs (no monthly
 * columns, no accounting number formats), but built with the same ExcelJS
 * primitives for visual consistency with every other file this app
 * generates. SheetJS (`xlsx`) still can't be used for the WRITE side, see
 * `workbook.ts`'s own top-of-file note on why.
 */

export interface MappingTemplateRow {
  ledger: string;
  classification: string | null;
  currentGrouping: string; // "" for a not-yet-mapped ledger
  bsPl: "B.S" | "P.L";
}

const NAVY = "FF1F4E78";
const HEADER_FILL = "FF1F4E78";

export function buildMappingTemplateWorkbook(
  companyName: string,
  rows: MappingTemplateRow[],
  groupings: string[],
): ExcelJS.Workbook {
  const wb = createWorkbook();
  const ws = addSheet(wb, "Ledger Mapping");

  ws.getCell(1, COL0).value = `Especia MIS: Ledger Mapping Template: ${companyName}`;
  ws.getCell(1, COL0).font = { name: "Calibri", bold: true, size: 12, color: { argb: NAVY } };
  ws.getCell(2, COL0).value =
    'Fill in or correct "New Grouping" below, then re-upload this same file on the Mapping page. ' +
    'Leave "New Grouping" blank to skip a row: nothing about that ledger changes.';
  ws.getCell(2, COL0).font = { name: "Calibri", italic: true, size: 10, color: { argb: "FF595959" } };
  ws.getCell(2, COL0).alignment = { wrapText: true };
  ws.mergeCells(2, COL0, 2, COL0 + 4);
  ws.getRow(2).height = 30;

  const headerRow = 4;
  const headers = ["Ledger", "Classification", "Current Grouping", "B.S/P.L", "New Grouping"];
  headers.forEach((h, i) => {
    const c = ws.getCell(headerRow, COL0 + i);
    c.value = h;
    c.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.alignment = { horizontal: "left", vertical: "middle" };
  });
  ws.views = [{ state: "frozen", ySplit: headerRow }];

  // Hidden reference sheet backing the "New Grouping" column's dropdown -
  // guidance, not a hard constraint: the cell isn't locked to this list,
  // matching the app's own "New grouping…" free-text escape hatch on the
  // one-row Mapping page editor.
  const groupingList = [...new Set(groupings)].sort();
  const refWs = addSheet(wb, "Groupings");
  groupingList.forEach((g, i) => {
    refWs.getCell(i + 1, 1).value = g;
  });
  refWs.state = "hidden";

  const newGroupingFormula =
    groupingList.length > 0 ? [`Groupings!$A$1:$A$${groupingList.length}`] : null;

  const sorted = [...rows].sort((a, b) => a.ledger.localeCompare(b.ledger));
  sorted.forEach((r, i) => {
    const row = headerRow + 1 + i;
    const unmapped = !r.currentGrouping;
    const values = [r.ledger, r.classification ?? "", r.currentGrouping, r.bsPl, ""];
    values.forEach((v, c) => {
      const cell = ws.getCell(row, COL0 + c);
      cell.value = v;
      if (unmapped) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER } };
    });
    // "New Grouping" is the last of the 5 columns above, give it an
    // Excel-native dropdown per data row (per-cell, not a range validation:
    // this ExcelJS version's Worksheet typings don't expose
    // `dataValidations.add`, but every Cell carries its own).
    if (newGroupingFormula) {
      ws.getCell(row, COL0 + 4).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: newGroupingFormula,
      };
    }
  });

  setWidths(ws, [28, 20, 20, 8, 24]);
  return wb;
}
