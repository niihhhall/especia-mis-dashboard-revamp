import { StatementTable } from "@/components/dashboard/statement-table";
import { Card } from "@/components/shared/card";
import { fmtPct, negParens, plural } from "@/lib/format";
import type { StatementCell, StatementColumn, StatementRowData } from "@/types/statement";

import type { summaryRows } from "./dashboard-data";

type SummaryColumn = { key: string; label: string; rows: ReturnType<typeof summaryRows> };

/** Profit summary: one column per month of the year to date, plus the YTD roll-up. Props only. */
export function ProfitSummaryCard({
  columns,
  unitText,
  months,
  fmt,
}: {
  columns: SummaryColumn[];
  unitText: string;
  months: number;
  fmt: (v: number) => string;
}) {
  const head: StatementColumn[] = columns.map((c) => ({ key: c.key, label: c.label }));
  const rows: StatementRowData[] = columns[0].rows.map((r, ri) => ({
    key: r.key,
    label: r.label,
    kind: r.strong ? "subtotal" : "line",
    cells: columns.map((c): StatementCell => {
      const cell = c.rows[ri];
      const base = c.rows[0].value; // sales, for % of revenue
      return {
        text: negParens(fmt(cell.value)),
        negative: cell.value < 0,
        sub: base ? fmtPct(cell.value / base) : undefined,
      };
    }),
  }));
  return (
    <Card
      title="Profit summary"
      subtitle={`${unitText} · ${plural(months, "{n} month to date", "{n} months to date")}`}
      flush
    >
      <StatementTable label="Profit summary" firstColumnLabel="Particulars" columns={head} rows={rows} />
    </Card>
  );
}
