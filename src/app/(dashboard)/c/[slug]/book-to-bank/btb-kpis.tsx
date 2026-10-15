import { KpiCell } from "@/components/dashboard/kpi-cell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { negParens } from "@/lib/format";

/** The four cash KPIs for the selected month. Values arrive unformatted with their formatter. Props only. */
export function BtbKpis({
  openingCash,
  closingCash,
  difference,
  withdrawableCash,
  fmt,
}: {
  openingCash: number;
  closingCash: number;
  difference: number;
  withdrawableCash: number;
  fmt: (v: number) => string;
}) {
  const show = (v: number) => negParens(fmt(v));
  return (
    <KpiStrip label="Cash figures" columns={4}>
      <KpiCell label="Opening cash / OD" value={show(openingCash)} />
      <KpiCell label="Closing cash / OD" value={show(closingCash)} />
      <KpiCell label="Net change" value={show(difference)} />
      <KpiCell label="Withdrawable cash" value={show(withdrawableCash)} />
    </KpiStrip>
  );
}
