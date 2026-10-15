"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import type { CSSProperties } from "react";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { negParens } from "@/lib/format";
import type { ChartMode, ChartRow, SeriesDef } from "@/types/chart";

/**
 * Bar, line or area over the same rows. Colors come from the series tokens
 * through the chart config, so the chart follows the theme without a reload.
 * Bar mode can color single bars (`barColor`) and print each value on top
 * (`valueLabels`); `tipFormat` words the tooltip value when it differs from the axis.
 */
export function TrendChart({
  data,
  series,
  mode,
  format,
  height = 280,
  label,
  barColor,
  valueLabels = false,
  tipFormat,
}: {
  data: ChartRow[];
  series: SeriesDef[];
  mode: ChartMode;
  format: (v: number) => string;
  height?: number;
  /** Accessible name of the plot. */
  label: string;
  barColor?: (row: ChartRow, seriesKey: string) => string | undefined;
  valueLabels?: boolean;
  tipFormat?: (v: number) => string;
}) {
  const config: ChartConfig = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }]));
  const fmt = (v: number) => negParens(format(v));
  const common = { data, accessibilityLayer: true, margin: { top: valueLabels ? 20 : 8, right: 12, left: -4, bottom: 0 } };
  const parts = [
    <CartesianGrid key="grid" vertical={false} strokeDasharray="3 3" stroke="var(--grid)" />,
    <XAxis key="x" dataKey="label" tickLine={false} axisLine={false} fontSize={11} />,
    <YAxis key="y" tickFormatter={(v: number) => fmt(v)} width={76} tickLine={false} axisLine={false} fontSize={11} />,
    <ChartTooltip
      key="tip"
      cursor={{ fill: "var(--surface-hover)", stroke: "var(--border-strong)" }}
      content={
        <ChartTooltipContent
          className="rounded-md border-border bg-popover text-body"
          formatter={(value, name, item) => (
            <div className="flex w-full items-center gap-2">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="text-text-secondary">{config[String(item.dataKey)]?.label ?? name}</span>
              <span className="num ml-auto pl-3 text-text-primary tabular-nums">{(tipFormat ?? fmt)(Number(value))}</span>
            </div>
          )}
        />
      }
    />,
    <ReferenceLine key="zero" y={0} stroke="var(--grid)" />,
  ];
  const dash = (i: number) => (i >= 3 ? "4 3" : undefined);
  const color = (key: string) => `var(--color-${key})`;

  return (
    <ChartContainer
      config={config}
      aria-label={label}
      className="aspect-auto h-(--chart-h) w-full min-w-0 [&_.recharts-responsive-container]:min-w-0"
      style={{ "--chart-h": `${height}px` } as CSSProperties}
    >
      {mode === "bar" ? (
        <BarChart {...common}>
          {parts}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={color(s.key)} radius={0} stroke="var(--surface)" isAnimationActive={false}>
              {barColor && data.map((row, i) => <Cell key={i} fill={barColor(row, s.key) ?? color(s.key)} />)}
              {valueLabels && <LabelList dataKey={s.key} position="top" formatter={(v) => fmt(Number(v))} className="fill-text-primary text-label" />}
            </Bar>
          ))}
        </BarChart>
      ) : mode === "line" ? (
        <LineChart {...common}>
          {parts}
          {series.map((s, i) => (
            <Line key={s.key} dataKey={s.key} name={s.label} stroke={color(s.key)} strokeDasharray={dash(i)} dot={false} activeDot={false} type="monotone" connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      ) : (
        <AreaChart {...common}>
          {parts}
          {series.map((s, i) => (
            <Area key={s.key} dataKey={s.key} name={s.label} stroke={color(s.key)} fill={color(s.key)} fillOpacity={0.12} strokeDasharray={dash(i)} dot={false} activeDot={false} type="monotone" connectNulls isAnimationActive={false} />
          ))}
        </AreaChart>
      )}
    </ChartContainer>
  );
}
