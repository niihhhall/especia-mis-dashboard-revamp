import { KpiCell } from "@/components/dashboard/kpi-cell";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import type { KpiItem } from "@/types/kpi";

/** The dashboard's ten KPIs, two rows of five on wide screens. Props only. */
export function DashboardKpis({ items }: { items: KpiItem[] }) {
  return (
    <KpiStrip label="Key figures" columns={5}>
      {items.map((k) => (
        <KpiCell key={k.key} label={k.label} value={k.value} delta={k.delta} caption="vs last month" />
      ))}
    </KpiStrip>
  );
}
