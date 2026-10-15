import { KpiCell } from "@/components/dashboard/kpi-cell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { fmtPct, negParens } from "@/lib/format";

/** The four P&L KPIs for the selected month, with margin subs. Values arrive unformatted with their formatter. */
export function PnlKpis({
  revenue,
  grossProfit,
  ebitda,
  ebt,
  fmt,
}: {
  revenue: number;
  grossProfit: number;
  ebitda: number;
  ebt: number;
  fmt: (v: number) => string;
}) {
  const show = (v: number) => negParens(fmt(v));
  const margin = (v: number) => `${revenue ? fmtPct(v / revenue) : "-"} margin`;
  return (
    <KpiStrip label="Profit figures" columns={4}>
      <KpiCell label="Revenue" value={show(revenue)} />
      <KpiCell label="Gross profit" value={show(grossProfit)} sub={margin(grossProfit)} />
      <KpiCell label="EBITDA" value={show(ebitda)} sub={margin(ebitda)} />
      <KpiCell label="Net profit (EBT)" value={show(ebt)} sub={margin(ebt)} />
    </KpiStrip>
  );
}
