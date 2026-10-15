import { KpiCell } from "@/components/dashboard/kpi-cell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { fmtPct, negParens } from "@/lib/format";

/** The four budget KPIs for the selected month. Values arrive unformatted with their formatter. Props only. */
export function BvaKpis({
  budgetRevenue,
  actualRevenue,
  revVariance,
  ebtVariance,
  revPct,
  ebtPct,
  fmt,
}: {
  budgetRevenue: number;
  actualRevenue: number;
  revVariance: number;
  ebtVariance: number;
  revPct: number | null;
  ebtPct: number | null;
  fmt: (v: number) => string;
}) {
  const show = (v: number) => negParens(fmt(v));
  const vs = (p: number | null) => (p !== null ? `${fmtPct(p)} vs budget` : undefined);
  return (
    <KpiStrip label="Budget figures" columns={4}>
      <KpiCell label="Budget revenue" value={show(budgetRevenue)} />
      <KpiCell label="Actual revenue" value={show(actualRevenue)} />
      <KpiCell label="Revenue variance" value={show(revVariance)} sub={vs(revPct)} />
      <KpiCell label="EBT variance" value={show(ebtVariance)} sub={vs(ebtPct)} />
    </KpiStrip>
  );
}
