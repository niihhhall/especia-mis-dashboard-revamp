"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import type { CSSProperties } from "react";

import { ChartTip } from "@/components/dashboard/chart-tooltip";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { negParens } from "@/lib/format";
import type { RankedRow, SeriesDef } from "@/types/chart";

/**
 * Horizontal bars, one category per row in the order given, one bar per
 * series. `signed` paints favourable rows positive and adverse rows negative
 * (single series); otherwise bars take their series color, or the row's own.
 */
export function RankedBarChart({
  rows,
  series = [{ key: "value", label: "Value", color: "var(--chart-1)" }],
  format,
  signed = false,
  height = 260,
  label,
}: {
  rows: RankedRow[];
  series?: SeriesDef[];
  format: (v: number) => string;
  signed?: boolean;
  height?: number;
  /** Accessible name of the plot. */
  label: string;
}) {
  const config: ChartConfig = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }]));
  const fillOf = (r: RankedRow, s: SeriesDef) => {
    if (signed) return (r.favorable ?? (r.values[s.key] ?? 0) >= 0) ? "var(--positive)" : "var(--negative)";
    return r.color ?? `var(--color-${s.key})`;
  };
  // With one series the row's own fill also colors the tooltip dot.
  const data = rows.map((r) => ({
    name: r.name,
    full: r.full ?? r.name,
    ...r.values,
    ...(series.length === 1 ? { fill: fillOf(r, series[0]) } : {}),
  }));
  const fmt = (v: number) => negParens(format(v));

  return (
    <ChartContainer
      config={config}
      aria-label={label}
      className="aspect-auto h-(--chart-h) w-full min-w-0 [&_.recharts-responsive-container]:min-w-0"
      style={{ "--chart-h": `${height}px` } as CSSProperties}
    >
      <BarChart data={data} layout="vertical" accessibilityLayer margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--grid)" />
        <XAxis type="number" tickFormatter={(v: number) => fmt(v)} tickLine={false} axisLine={false} fontSize={11} />
        <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip
          cursor={{ fill: "var(--surface-hover)" }}
          content={<ChartTip format={fmt} labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""} />}
        />
        <ReferenceLine x={0} stroke="var(--grid)" />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={`var(--color-${s.key})`}
            radius={0}
            stroke="var(--surface)"
            isAnimationActive={false}
          >
            {rows.map((r, i) => (
              <Cell key={i} fill={fillOf(r, s)} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  );
}
