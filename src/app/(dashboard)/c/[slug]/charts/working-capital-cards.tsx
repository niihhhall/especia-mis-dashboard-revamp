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
const BALANCE_METRICS = [
  { key: "debtors", label: "Debtors" },
  { key: "creditors", label: "Creditors" },
  { key: "inventory", label: "Inventory" },
  { key: "cash", label: "Cash & bank" },
] as const;
const DAYS_METRICS = [
  { key: "dcp", label: "Debtor days" },
  { key: "icp", label: "Inventory days" },
  { key: "cpp", label: "Creditor days" },
  { key: "ccc", label: "Cash conversion cycle" },
] as const;

// Each metric keeps its own series color, whichever are shown.
const withColors = (defs: readonly { key: keyof MonthPoint; label: string }[]): SeriesDef[] =>
  defs.map((d, i) => ({ key: d.key, label: d.label, color: `var(--chart-${i + 1})` }));
const BAL_DEFS = withColors(BALANCE_METRICS);
const DAY_DEFS = withColors(DAYS_METRICS);
const lastN = <T,>(rows: T[], n: number): T[] => (n > 0 ? rows.slice(-n) : rows);
const rowsOf = (months: MonthPoint[], series: SeriesDef[]): ChartRow[] =>
  months.map((m) => ({ label: m.label, ...Object.fromEntries(series.map((s) => [s.key, m[s.key as keyof MonthPoint] as number])) }));

/** One trend card with its own series toggle and chart type. */
function SeriesCard({
  title,
  subtitle,
  defs,
  initial,
  initialType,
  months,
  format,
  digits,
}: {
  title: string;
  subtitle: string;
  defs: SeriesDef[];
  initial: string[];
  initialType: ChartMode;
  months: MonthPoint[];
  format: (v: number) => string;
  digits: number;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [type, setType] = useState<ChartMode>(initialType);
  const series = defs.filter((d) => picked.includes(d.key));
  const rows = rowsOf(months, series);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      legend={series.map((s) => ({ name: s.label, color: s.color }))}
      csv={[["Month", ...series.map((s) => s.label)], ...rows.map((r) => [r.label as string, ...series.map((s) => Number(r[s.key]).toFixed(digits))])]}
      controls={<SegmentedControl label="Chart type" value={type} onChange={(v) => v && setType(v)} options={TYPE_OPTIONS} />}
    >
      <div className="flex flex-col gap-4">
        <SeriesToggle label="Series" options={defs.map((d) => ({ key: d.key, name: d.label, color: d.color }))} value={picked} onChange={setPicked} />
        <TrendChart data={rows} series={series} mode={type} format={format} label={title} />
      </div>
    </ChartCard>
  );
}

/** Working capital balances and the cash conversion cycle, over the board's month range. */
export function WorkingCapitalCards({ months, range }: { months: MonthPoint[]; range: number }) {
  const fmtCompact = useFmtCompact();
  const shown = lastN(months, range);
  return (
    <>
      <SeriesCard
        title="Working capital balances"
        subtitle="Month-end closing position"
        defs={BAL_DEFS}
        initial={["debtors", "creditors", "inventory"]}
        initialType="line"
        months={shown}
        format={fmtCompact}
        digits={2}
      />
      <SeriesCard
        title="Cash conversion cycle (days)"
        subtitle="DCP + ICP − CPP, each month's own figure"
        defs={DAY_DEFS}
        initial={["dcp", "icp", "cpp", "ccc"]}
        initialType="line"
        months={shown}
        format={(v) => `${Math.round(v)}d`}
        digits={1}
      />
    </>
  );
}
