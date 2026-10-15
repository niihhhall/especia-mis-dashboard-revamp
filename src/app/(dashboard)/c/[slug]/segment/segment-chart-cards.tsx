"use client";

import { BreakdownDonut } from "@/components/dashboard/breakdown-donut";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { useFmtCompact } from "@/components/layout/unit-context";
import { fmtPct } from "@/lib/format";
import type { SeriesDef } from "@/types/chart";

export interface SegmentChartRow {
  name: string;
  revenue: number;
  grossProfit: number;
  mix: number;
}

// Gross profit is a value, not a delta, so every bar takes the accent; a loss reads from below the zero line.
const GP_SERIES: SeriesDef[] = [{ key: "grossProfit", label: "Gross profit", color: "var(--chart-1)" }];

/** "Revenue share by segment" (donut, no center value) and "Gross profit by segment" (bars). */
export function SegmentChartCards({ data }: { data: SegmentChartRow[] }) {
  const fmtCompact = useFmtCompact();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard
        title="Revenue share by segment"
        downloads={false}
        height={220}
        state={data.every((d) => d.revenue <= 0) ? "empty" : "ready"}
        empty="No segment revenue for this month."
      >
        <BreakdownDonut
          items={data.map((d, i) => ({
            key: d.name,
            label: d.name,
            value: d.revenue,
            color: `var(--chart-${(i % 6) + 1})`,
            detail: fmtPct(d.mix),
          }))}
          format={fmtCompact}
          height={220}
          label="Revenue share by segment"
        />
      </ChartCard>
      <ChartCard
        title="Gross profit by segment"
        downloads={false}
        height={252}
        state={data.length === 0 ? "empty" : "ready"}
        empty="No segments to plot for this month."
      >
        <TrendChart
          data={data.map((d) => ({ label: d.name, grossProfit: d.grossProfit }))}
          series={GP_SERIES}
          mode="bar"
          format={fmtCompact}
          height={252}
          label="Gross profit by segment"
        />
      </ChartCard>
    </div>
  );
}
