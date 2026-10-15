"use client";

import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import type { ChartRow, SeriesDef } from "@/types/chart";

export interface CccBar {
  name: string;
  value: number;
  emphasis?: boolean;
}

// The accent carries the headline CCC bar; a grey carries the components.
const SERIES: SeriesDef[] = [{ key: "value", label: "Value", color: "var(--chart-2)" }];

/** "CCC components (days)": the three periods and the cycle, with each value on its bar. */
export function CccComponentsCard({ bars, className }: { bars: CccBar[]; className?: string }) {
  const rows: ChartRow[] = bars.map((b) => ({ label: b.name, value: b.value, emphasis: b.emphasis ? 1 : 0 }));
  return (
    <ChartCard
      title="CCC components (days)"
      downloads={false}
      height={280}
      className={className}
    >
      <TrendChart
        data={rows}
        series={SERIES}
        mode="bar"
        format={(v) => `${v}d`}
        tipFormat={(v) => `${v} days`}
        barColor={(row) => (row.emphasis ? "var(--chart-1)" : undefined)}
        valueLabels
        label="CCC components (days)"
      />
    </ChartCard>
  );
}
