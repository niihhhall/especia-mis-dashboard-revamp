import "server-only";

import {
  getCompany,
  getFyPeriods,
  getManualInputs,
  getMasterRows,
  getMisSegments,
  getMisTemplate,
  getReportScope,
  type Period,
} from "@/lib/data/mis";
import type { TemplateLine } from "@/lib/mis/catalog";
import { bookToBankLines, computeBookToBank } from "@/lib/mis/book-to-bank";
import { planColumns, quarterLabel, type Quarter } from "@/lib/mis/quarters";
import { buildYtd } from "@/lib/mis/ytd";
import type { MasterRowScope } from "@/lib/mis/types";

import type { BtbColumn } from "./btb-rows";

async function btbForPeriod(periodId: string, template: TemplateLine[], scope: MasterRowScope) {
  const [rows, manual] = await Promise.all([getMasterRows(periodId, scope), getManualInputs(periodId, scope)]);
  return computeBookToBank(rows, manual, template);
}

/** Everything the Book to Bank page shows for the selected period and quarters. */
export async function loadBtbView(companyId: string | undefined, current: Period, selectedQuarters: Quarter[]) {
  const [company, fyPeriods, template, reportScope, segments] = await Promise.all([
    getCompany(companyId),
    getFyPeriods(current, companyId),
    getMisTemplate(companyId),
    getReportScope(companyId, "book_to_bank"),
    getMisSegments(companyId),
  ]);
  const fyStartNo = company?.fy_start_month ?? 4;
  const results = await Promise.all(fyPeriods.map((p) => btbForPeriod(p.id, template, reportScope.scope)));

  // Cash opens at the quarter's / year's first month and closes at its last; every other line is a flow.
  const CASH_BALANCES = { first: ["bank-opening"], last: ["bank-closing"] };
  const monthLines = fyPeriods.map((_, i) => bookToBankLines(results[i]));
  const monthColumns: BtbColumn[] = planColumns(
    fyPeriods.map((p, i) => ({ p, lines: monthLines[i] })),
    (x) => x.p.month,
    selectedQuarters,
    fyStartNo,
  ).map((entry) =>
    entry.kind === "month"
      ? { key: entry.item.p.id, label: entry.item.p.label, lines: entry.item.lines }
      : {
          key: `q${entry.quarter}`,
          label: quarterLabel(entry.quarter, entry.items.length),
          lines: buildYtd(entry.items.map((x) => x.lines), CASH_BALANCES),
        },
  );

  // A single month is already its own YTD, so the column is not repeated.
  // Every Book to Bank line is a flow, so the same summing YTD builder used
  // for the P&L is correct here too: there's no opening/closing-stock-style
  // balance among these lines for it to mishandle.
  const columns: BtbColumn[] =
    monthColumns.length > 1
      ? [...monthColumns, { key: "ytd", label: "YTD", lines: buildYtd(monthLines, CASH_BALANCES) }]
      : monthColumns;

  const currentIdx = fyPeriods.findIndex((p) => p.id === current.id);
  const b = results[currentIdx] ?? results[results.length - 1];

  return { company, fyPeriods, fyStartNo, columns, b, reportScope, segments };
}
