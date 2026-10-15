import { StatementTable } from "@/components/dashboard/statement-table";
import { Card } from "@/components/shared/card";
import { negParens } from "@/lib/format";
import type { StatementColumn, StatementRowData } from "@/types/statement";

import type { BalanceColumn, balanceRows } from "./dashboard-data";

/** Balance sheet summary: closing balances per month, the opening column and the YTD column. Props only. */
export function BalanceSheetCard({
  columns,
  rows: defs,
  unitText,
  fmt,
}: {
  columns: BalanceColumn[];
  rows: typeof balanceRows;
  unitText: string;
  fmt: (v: number) => string;
}) {
  const head: StatementColumn[] = columns.map((c) => ({ key: c.key, label: c.label }));
  const rows: StatementRowData[] = defs.map((r) => ({
    key: r.key,
    label: r.label,
    kind: r.key === "cccDays" ? "subtotal" : "line",
    cells: columns.map((c) => {
      const v = r.get(c);
      return {
        text: v === null ? "-" : r.days ? `${v}d` : negParens(fmt(v)),
        negative: v !== null && v < 0,
      };
    }),
  }));
  return (
    <Card title="Balance sheet summary" subtitle={`${unitText} · closing position`} flush>
      <StatementTable
        label="Balance sheet summary"
        firstColumnLabel="Particulars"
        columns={head}
        rows={rows}
        columnWidth="lg"
      />
    </Card>
  );
}
