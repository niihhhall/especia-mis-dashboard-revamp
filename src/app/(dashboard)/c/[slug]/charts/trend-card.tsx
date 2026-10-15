"use client";

import { useState } from "react";

import { ChartCard } from "@/components/dashboard/chart-card";
import { SeriesToggle } from "@/components/dashboard/series-toggle";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { useFmtCompact } from "@/components/layout/unit-context";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { MonthPoint } from "@/lib/data/charts";
import type { ChartMode, ChartRow, SeriesDef } from "@/types/chart";

const TYPE_OPTIONS: { value: ChartMode; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
];

const TREND_METRICS: { key: keyof MonthPoint; name: string }[] = [
  { key: "revenue", name: "Revenue" },
  { key: "cogs", name: "COGS" },
  { key: "grossProfit", name: "Gross profit" },
  { key: "indirectExpense", name: "Indirect expense" },
  { key: "ebitda", name: "EBITDA" },
  { key: "ebt", name: "EBT" },
];

const lastN = <T,>(rows: T[], n: number): T[] => (n > 0 ? rows.slice(-n) : rows);
const pct = (v: number, base: number) => (base !== 0 ? (v / base) * 100 : 0);
const fmtPctPoints = (v: number) => `${v.toFixed(1)}%`;

/** Monthly trend: the chosen metrics as an amount or % of revenue, over the board's month range. */
export function TrendCard({ months, range }: { months: MonthPoint[]; range: number }) {
  const fmtCompact = useFmtCompact();
  const [picked, setPicked] = useState<string[]>(["revenue", "grossProfit", "ebt"]);
  const [type, setType] = useState<ChartMode>("bar");
  const [mode, setMode] = useState<"amount" | "pct">("amount");

  // Shown series take chart-1, chart-2 and on in metric order, so the first is always the accent.
  const shown = TREND_METRICS.filter((m) => picked.includes(m.key) && !(mode === "pct" && m.key === "revenue"));
  const series: SeriesDef[] = shown.map((m, i) => ({ key: m.key, label: m.name, color: `var(--chart-${i + 1})` }));
  const colorOf = (key: string) => series.find((s) => s.key === key)?.color ?? "var(--chart-3)";
  const rows: ChartRow[] = lastN(months, range).map((m) => ({
    label: m.label,
    ...Object.fromEntries(
      shown.map((d) => [d.key, mode === "pct" ? pct(m[d.key] as number, m.revenue) : (m[d.key] as number)]),
    ),
  }));

  return (
    <ChartCard
      title="Monthly trend"
      subtitle={mode === "pct" ? "Each metric as % of revenue" : "Financial-year months to date"}
      legend={series.map((s) => ({ name: s.label, color: s.color }))}
      csv={[["Month", ...series.map((s) => s.label)], ...rows.map((r) => [r.label as string, ...series.map((s) => Number(r[s.key]).toFixed(2))])]}
      controls={
        <>
          <SegmentedControl
            label="Value"
            value={mode}
            onChange={(v) => v && setMode(v)}
            options={[{ value: "amount", label: "Amount" }, { value: "pct", label: "% of rev" }]}
          />
          <SegmentedControl label="Chart type" value={type} onChange={(v) => v && setType(v)} options={TYPE_OPTIONS} />
        </>
      }
    >
      <div className="flex flex-col gap-4">
      <SeriesToggle
        label="Series"
        options={TREND_METRICS.map((m) => ({ key: m.key, name: m.name, color: colorOf(m.key) }))}
        value={picked}
        onChange={setPicked}
      />
      <TrendChart data={rows} series={series} mode={type} format={mode === "pct" ? fmtPctPoints : fmtCompact} label="Monthly trend" />
      </div>
    </ChartCard>
  );
}
