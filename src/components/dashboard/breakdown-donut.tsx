"use client";

import { Cell, Pie, PieChart } from "recharts";
import type { CSSProperties } from "react";

import { ChartTip } from "@/components/dashboard/chart-tooltip";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { negParens } from "@/lib/format";
import type { BreakdownItem } from "@/types/chart";

/**
 * Part to whole: a donut (inner radius 68%, 2px surface separators) with an
 * optional total in the center, and a legend of dot, name and detail beside
 * it from `md`. Slices keep the order and colors they are given.
 */
export function BreakdownDonut({
  items,
  centerValue,
  format,
  height = 240,
  label,
}: {
  items: BreakdownItem[];
  /** The total drawn in the hole, with "Total" under it. */
  centerValue?: string;
  format: (v: number) => string;
  height?: number;
  /** Accessible name of the plot. */
  label: string;
}) {
  const config: ChartConfig = Object.fromEntries(items.map((it, i) => [`s${i}`, { label: it.label, color: it.color }]));
  const data = items.map((it) => ({ label: it.label, value: it.value, fill: it.color }));
  const fmt = (v: number) => negParens(format(v));

  return (
    <div className="grid items-center gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <div className="relative">
        <ChartContainer
          config={config}
          aria-label={label}
          className="aspect-auto h-(--chart-h) w-full min-w-0 [&_.recharts-responsive-container]:min-w-0"
          style={{ "--chart-h": `${height}px` } as CSSProperties}
        >
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTip format={fmt} hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              stroke="var(--surface)"
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {centerValue && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-title text-text-primary tabular-nums">
              {centerValue}
            </span>
            <span className="text-label text-text-secondary">Total</span>
          </div>
        )}
      </div>
      <ul className="grid gap-2 text-body">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: it.color }} />
              <span className="line-clamp-2 min-w-0 break-words text-text-primary">{it.label}</span>
            </span>
            {it.detail && <span className="shrink-0 text-text-secondary tabular-nums">{it.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
