"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { useChartColors, type ChartColors } from "@/components/charts/use-chart-colors";
import type { ChartsData, CompareRow, MonthPoint } from "@/lib/data/charts";
import { fmtPct } from "@/lib/format";
import { useFmtCompact } from "@/components/layout/unit-context";
import { trimCommonPrefix } from "@/lib/mis/charts";

import { Chip, ChartFrame, Seg, type LegendItem } from "./chart-frame";

type ChartType = "bar" | "line" | "area";
interface Series {
  key: string;
  name: string;
  color: string;
}
type Row = Record<string, number | string | null>;

const TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
];

const RANGE_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: "3 mo" },
  { value: 6, label: "6 mo" },
  { value: 12, label: "12 mo" },
  { value: 0, label: "All" },
];

const selectCls =
  "h-8 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const lastN = <T,>(rows: T[], n: number): T[] => (n > 0 ? rows.slice(-n) : rows);
const pct = (v: number, base: number) => (base !== 0 ? (v / base) * 100 : 0);
const fmtPctPoints = (v: number) => `${v.toFixed(1)}%`;

/** Bar / line / area over the same rows — the chart-type switch every trend card shares. */
function SeriesChart({
  rows,
  series,
  type,
  fmt,
  height = 270,
}: {
  rows: Row[];
  series: Series[];
  type: ChartType;
  fmt: (v: number) => string;
  height?: number;
}) {
  const { axis } = useChartColors();
  const common = { data: rows, margin: { top: 8, right: 12, left: -4, bottom: 0 } };
  const xAxis = <XAxis dataKey="label" tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />;
  const yAxis = (
    <YAxis tickFormatter={(v: number) => fmt(v)} width={76} tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />
  );
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />;
  const tip = <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: axis.cursor }} />;
  const zero = <ReferenceLine y={0} stroke={axis.grid} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "bar" ? (
        <BarChart {...common}>
          {grid}
          {xAxis}
          {yAxis}
          {tip}
          {zero}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      ) : type === "line" ? (
        <LineChart {...common}>
          {grid}
          {xAxis}
          {yAxis}
          {tip}
          {zero}
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} type="monotone" connectNulls />
          ))}
        </LineChart>
      ) : (
        <AreaChart {...common}>
          {grid}
          {xAxis}
          {yAxis}
          {tip}
          {zero}
          {series.map((s) => (
            <Area key={s.key} dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.15} strokeWidth={2.5} type="monotone" connectNulls />
          ))}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

function toggle(set: string[], key: string): string[] {
  if (set.includes(key)) return set.length > 1 ? set.filter((k) => k !== key) : set;
  return [...set, key];
}

const TREND_METRICS: { key: keyof MonthPoint; name: string }[] = [
  { key: "revenue", name: "Revenue" },
  { key: "cogs", name: "COGS" },
  { key: "grossProfit", name: "Gross Profit" },
  { key: "indirectExpense", name: "Indirect Expense" },
  { key: "ebitda", name: "EBITDA" },
  { key: "ebt", name: "EBT" },
];

function TrendCard({ months, range, colors }: { months: MonthPoint[]; range: number; colors: string[] }) {
  const fmtCompact = useFmtCompact();
  const [picked, setPicked] = useState<string[]>(["revenue", "grossProfit", "ebt"]);
  const [type, setType] = useState<ChartType>("bar");
  const [mode, setMode] = useState<"amount" | "pct">("amount");

  const defs = TREND_METRICS.map((m, i) => ({ ...m, color: colors[i % colors.length] }));
  const active = defs.filter((d) => picked.includes(d.key) && !(mode === "pct" && d.key === "revenue"));
  const data = lastN(months, range);
  const rows: Row[] = data.map((m) => ({
    label: m.label,
    ...Object.fromEntries(
      active.map((d) => [d.key, mode === "pct" ? pct(m[d.key] as number, m.revenue) : (m[d.key] as number)]),
    ),
  }));
  const series: Series[] = active.map((d) => ({ key: d.key, name: d.name, color: d.color }));
  const legend: LegendItem[] = series.map((s) => ({ name: s.name, color: s.color }));

  return (
    <ChartFrame
      title="Monthly trend"
      subtitle={mode === "pct" ? "Each metric as % of revenue" : "Financial-year months to date"}
      legend={legend}
      csv={[["Month", ...series.map((s) => s.name)], ...rows.map((r) => [r.label as string, ...series.map((s) => Number(r[s.key]).toFixed(2))])]}
      controls={
        <>
          <Seg label="Value" value={mode} onChange={setMode} options={[{ value: "amount", label: "Amount" }, { value: "pct", label: "% of rev" }]} />
          <Seg label="Chart type" value={type} onChange={setType} options={TYPE_OPTIONS} />
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {defs.map((d) => (
          <Chip key={d.key} color={d.color} active={picked.includes(d.key)} onClick={() => setPicked(toggle(picked, d.key))}>
            {d.name}
          </Chip>
        ))}
      </div>
      <SeriesChart rows={rows} series={series} type={type} fmt={mode === "pct" ? fmtPctPoints : fmtCompact} />
    </ChartFrame>
  );
}

const EXPENSE_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "direct_expense", label: "Direct" },
  { value: "indirect_expense", label: "Indirect" },
  { value: "purchase", label: "Purchase" },
] as const;

function ExpenseCard({ data, colors }: { data: ChartsData; colors: string[] }) {
  const fmtCompact = useFmtCompact();
  const { axis } = useChartColors();
  const [monthId, setMonthId] = useState(data.currentId);
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]["value"]>("all");
  const [top, setTop] = useState(8);
  const [view, setView] = useState<"donut" | "bar">("donut");

  // A company with no months yet has nothing to break down.
  const month: MonthPoint | undefined = data.months.find((m) => m.id === monthId) ?? data.months[data.months.length - 1];
  const items = (month ? (data.expensesByMonth[month.id] ?? []) : [])
    .filter((e) => e.value > 0 && (category === "all" || e.section === category))
    .sort((a, b) => b.value - a.value);
  const shown = items.slice(0, top);
  const rest = items.slice(top).reduce((a, e) => a + e.value, 0);
  const slices = rest > 0 ? [...shown, { key: "others", label: "Others", section: "indirect_expense" as const, value: rest }] : shown;
  const total = items.reduce((a, e) => a + e.value, 0);
  const colorOf = (i: number) => (slices[i]?.key === "others" ? axis.text : colors[i % colors.length]);

  return (
    <ChartFrame
      title="Expense breakdown"
      subtitle={month ? `${month.label} · ${fmtCompact(total)} across ${items.length} lines` : undefined}
      legend={slices.map((s, i) => ({ name: s.label, color: colorOf(i) }))}
      csv={[["Line", "Section", "Amount", "Share %"], ...items.map((e) => [e.label, e.section, e.value.toFixed(2), pct(e.value, total).toFixed(2)])]}
      controls={
        <>
          <select aria-label="Month" value={month?.id ?? ""} onChange={(e) => setMonthId(e.target.value)} className={selectCls}>
            {data.months.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <Seg label="Category" value={category} onChange={setCategory} options={[...EXPENSE_CATEGORIES]} />
          <Seg label="Show top" value={top} onChange={setTop} options={[{ value: 5, label: "Top 5" }, { value: 8, label: "Top 8" }, { value: 12, label: "Top 12" }]} />
          <Seg label="View" value={view} onChange={setView} options={[{ value: "donut", label: "Donut" }, { value: "bar", label: "Bar" }]} />
        </>
      }
      empty={
        !month
          ? "No months uploaded yet."
          : slices.length === 0
            ? "No expense lines with a positive amount for this selection."
            : undefined
      }
    >
      {view === "donut" ? (
        <div className="grid items-center gap-4 md:grid-cols-[260px_1fr]">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="label" innerRadius={62} outerRadius={105} paddingAngle={2} stroke="none">
                {slices.map((_, i) => (
                  <Cell key={i} fill={colorOf(i)} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtCompact(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="grid gap-1.5 text-xs">
            {slices.map((s, i) => (
              <li key={s.key} className="flex items-center justify-between gap-3 border-b border-border/60 pb-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colorOf(i) }} />
                  <span className="line-clamp-2 min-w-0 break-words">{s.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmtCompact(s.value)} · {fmtPct(s.value / total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, slices.length * 30 + 40)}>
          <BarChart data={slices} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => fmtCompact(v)} tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={150} tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => fmtCompact(Number(v))} cursor={{ fill: axis.cursor }} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {slices.map((_, i) => (
                <Cell key={i} fill={colorOf(i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

const COMPARE_METRICS = [
  { value: "revenue", label: "Revenue" },
  { value: "grossProfit", label: "Gross Profit" },
  { value: "ebitda", label: "EBITDA" },
  { value: "ebt", label: "EBT" },
  { value: "margin", label: "EBT margin %" },
] as const;

function CompareCard({ data, monthLabel, palette }: { data: ChartsData; monthLabel: string; palette: ChartColors }) {
  const fmtCompact = useFmtCompact();
  // The board's palette, already resolved, so no frame paints without colours.
  const { colors, axis, sign } = palette;
  const hasChannels = data.channels.length > 0;
  const hasBranches = data.branches.length > 0;
  const [kind, setKind] = useState<"channels" | "branches">(hasChannels ? "channels" : "branches");
  const [metric, setMetric] = useState<(typeof COMPARE_METRICS)[number]["value"]>("revenue");

  const source: CompareRow[] = kind === "channels" && hasChannels ? data.channels : data.branches;
  const names = kind === "channels" && hasChannels ? source.map((r) => r.name) : trimCommonPrefix(source.map((r) => r.name));
  const valueOf = (r: CompareRow) => (metric === "margin" ? pct(r.ebt, r.revenue) : r[metric]);
  const rows = source
    .map((r, i) => ({ name: names[i], full: r.name, value: valueOf(r) }))
    .sort((a, b) => b.value - a.value);
  const isPct = metric === "margin";
  const fmt = isPct ? fmtPctPoints : fmtCompact;
  const signed = metric !== "revenue";

  return (
    <ChartFrame
      title={kind === "channels" && hasChannels ? "Channel comparison" : "Branch comparison"}
      subtitle={`${monthLabel} · ${COMPARE_METRICS.find((m) => m.value === metric)?.label}`}
      legend={signed ? [{ name: "Positive", color: sign.pos }, { name: "Negative", color: sign.neg }] : [{ name: "Revenue", color: colors[0] }]}
      showLegend
      csv={[["Name", "Revenue", "Gross Profit", "EBITDA", "EBT"], ...source.map((r) => [r.name, r.revenue.toFixed(2), r.grossProfit.toFixed(2), r.ebitda.toFixed(2), r.ebt.toFixed(2)])]}
      controls={
        <>
          {hasChannels && hasBranches && (
            <Seg label="Compare" value={kind} onChange={setKind} options={[{ value: "channels", label: "Channels" }, { value: "branches", label: "Branches" }]} />
          )}
          <select aria-label="Metric" value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)} className={selectCls}>
            {COMPARE_METRICS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </>
      }
    >
      <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 32 + 40)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} horizontal={false} />
          <XAxis type="number" tickFormatter={(v: number) => fmt(v)} tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""} cursor={{ fill: axis.cursor }} />
          <ReferenceLine x={0} stroke={axis.grid} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {rows.map((r, i) => (
              <Cell key={i} fill={signed ? (r.value >= 0 ? sign.pos : sign.neg) : colors[0]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

const BUDGET_METRICS = [
  { value: "revenue", label: "Revenue" },
  { value: "cogs", label: "COGS" },
  { value: "grossProfit", label: "Gross Profit" },
  { value: "indirectExpense", label: "Indirect Expense" },
  { value: "ebitda", label: "EBITDA" },
  { value: "ebt", label: "EBT" },
] as const;

const REVENUE_TYPE = new Set(["revenue", "indirect_income"]);

function BudgetCards({ data, range, colors, budgetHref }: { data: ChartsData; range: number; colors: string[]; budgetHref: string }) {
  const fmtCompact = useFmtCompact();
  const { axis, sign } = useChartColors();
  const [metric, setMetric] = useState<(typeof BUDGET_METRICS)[number]["value"]>("revenue");
  const [type, setType] = useState<ChartType>("bar");

  if (!data.hasBudget) {
    return (
      <div className="card-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Budget vs Actual</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No budget has been entered yet.{" "}
          <Link href={budgetHref} className="font-medium text-primary underline">
            Upload a Budget template
          </Link>{" "}
          to see monthly, by-section and top-variance charts here.
        </p>
      </div>
    );
  }

  const label = BUDGET_METRICS.find((m) => m.value === metric)?.label ?? "";
  const monthsInRange = lastN(data.months, range);
  const monthRows: Row[] = monthsInRange.map((m) => ({ label: m.label, budget: m.budget ? m.budget[metric] : null, actual: m[metric] }));
  const monthSeries: Series[] = [
    { key: "budget", name: "Budget", color: axis.text },
    { key: "actual", name: "Actual", color: colors[0] },
  ];

  const current = data.months.find((m) => m.id === data.currentId) ?? data.months[data.months.length - 1];
  const sectionRows: Row[] = BUDGET_METRICS.map((m) => ({
    label: m.label,
    budget: current.budget ? current.budget[m.value] : null,
    actual: current[m.value],
  }));

  const variance = data.variances
    .map((v) => {
      const diff = v.actual - v.budget;
      const favorable = REVENUE_TYPE.has(v.section) ? diff > 0 : diff < 0;
      return { name: v.label, value: diff, favorable };
    })
    .filter((v) => v.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 8);

  return (
    <>
      <ChartFrame
        title="Budget vs Actual by month"
        subtitle={label}
        legend={monthSeries.map((s) => ({ name: s.name, color: s.color }))}
        showLegend
        csv={[["Month", "Budget", "Actual"], ...monthRows.map((r) => [r.label as string, r.budget == null ? "" : Number(r.budget).toFixed(2), Number(r.actual).toFixed(2)])]}
        controls={
          <>
            <select aria-label="Metric" value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)} className={selectCls}>
              {BUDGET_METRICS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <Seg label="Chart type" value={type} onChange={setType} options={TYPE_OPTIONS.slice(0, 2)} />
          </>
        }
      >
        <SeriesChart rows={monthRows} series={monthSeries} type={type} fmt={fmtCompact} />
      </ChartFrame>

      <ChartFrame
        title={`${current.label}: Budget vs Actual by section`}
        legend={monthSeries.map((s) => ({ name: s.name, color: s.color }))}
        showLegend
        csv={[["Section", "Budget", "Actual"], ...sectionRows.map((r) => [r.label as string, r.budget == null ? "" : Number(r.budget).toFixed(2), Number(r.actual).toFixed(2)])]}
      >
        <SeriesChart rows={sectionRows} series={monthSeries} type="bar" fmt={fmtCompact} />
      </ChartFrame>

      <ChartFrame
        title={`${current.label}: biggest variances`}
        subtitle="Actual minus Budget · green is favourable, red is unfavourable"
        legend={[{ name: "Favourable", color: sign.pos }, { name: "Unfavourable", color: sign.neg }]}
        showLegend
        csv={[["Line", "Variance", "Favourable"], ...variance.map((v) => [v.name, v.value.toFixed(2), v.favorable ? "yes" : "no"])]}
        empty={variance.length === 0 ? "No line differs from its budget for this month." : undefined}
      >
        <ResponsiveContainer width="100%" height={Math.max(220, variance.length * 32 + 40)}>
          <BarChart data={variance} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => fmtCompact(v)} tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fill: axis.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => fmtCompact(Number(v))} cursor={{ fill: axis.cursor }} />
            <ReferenceLine x={0} stroke={axis.grid} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {variance.map((v, i) => (
                <Cell key={i} fill={v.favorable ? sign.pos : sign.neg} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </>
  );
}

const BALANCE_METRICS = [
  { key: "debtors", name: "Debtors" },
  { key: "creditors", name: "Creditors" },
  { key: "inventory", name: "Inventory" },
  { key: "cash", name: "Cash & Bank" },
] as const;
const DAYS_METRICS = [
  { key: "dcp", name: "Debtor days" },
  { key: "icp", name: "Inventory days" },
  { key: "cpp", name: "Creditor days" },
  { key: "ccc", name: "Cash conversion cycle" },
] as const;

function WorkingCapitalCards({ months, range, colors }: { months: MonthPoint[]; range: number; colors: string[] }) {
  const fmtCompact = useFmtCompact();
  const [balPicked, setBalPicked] = useState<string[]>(["debtors", "creditors", "inventory"]);
  const [balType, setBalType] = useState<ChartType>("line");
  const [daysPicked, setDaysPicked] = useState<string[]>(["dcp", "icp", "cpp", "ccc"]);
  const [daysType, setDaysType] = useState<ChartType>("line");

  const data = lastN(months, range);
  const balDefs = BALANCE_METRICS.map((m, i) => ({ ...m, color: colors[i % colors.length] }));
  const dayDefs = DAYS_METRICS.map((m, i) => ({ ...m, color: colors[i % colors.length] }));
  const balSeries = balDefs.filter((d) => balPicked.includes(d.key));
  const daySeries = dayDefs.filter((d) => daysPicked.includes(d.key));
  const balRows: Row[] = data.map((m) => ({ label: m.label, ...Object.fromEntries(balSeries.map((s) => [s.key, m[s.key]])) }));
  const dayRows: Row[] = data.map((m) => ({ label: m.label, ...Object.fromEntries(daySeries.map((s) => [s.key, m[s.key]])) }));

  return (
    <>
      <ChartFrame
        title="Working capital balances"
        subtitle="Month-end closing position"
        legend={balSeries.map((s) => ({ name: s.name, color: s.color }))}
        csv={[["Month", ...balSeries.map((s) => s.name)], ...balRows.map((r) => [r.label as string, ...balSeries.map((s) => Number(r[s.key]).toFixed(2))])]}
        controls={<Seg label="Chart type" value={balType} onChange={setBalType} options={TYPE_OPTIONS} />}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {balDefs.map((d) => (
            <Chip key={d.key} color={d.color} active={balPicked.includes(d.key)} onClick={() => setBalPicked(toggle(balPicked, d.key))}>
              {d.name}
            </Chip>
          ))}
        </div>
        <SeriesChart rows={balRows} series={balSeries} type={balType} fmt={fmtCompact} />
      </ChartFrame>

      <ChartFrame
        title="Cash conversion cycle (days)"
        subtitle="DCP + ICP − CPP, each month's own figure"
        legend={daySeries.map((s) => ({ name: s.name, color: s.color }))}
        csv={[["Month", ...daySeries.map((s) => s.name)], ...dayRows.map((r) => [r.label as string, ...daySeries.map((s) => Number(r[s.key]).toFixed(1))])]}
        controls={<Seg label="Chart type" value={daysType} onChange={setDaysType} options={TYPE_OPTIONS} />}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {dayDefs.map((d) => (
            <Chip key={d.key} color={d.color} active={daysPicked.includes(d.key)} onClick={() => setDaysPicked(toggle(daysPicked, d.key))}>
              {d.name}
            </Chip>
          ))}
        </div>
        <SeriesChart rows={dayRows} series={daySeries} type={daysType} fmt={(v) => `${Math.round(v)}d`} />
      </ChartFrame>
    </>
  );
}

export function ChartsBoard({ data, budgetHref }: { data: ChartsData; budgetHref: string }) {
  const palette = useChartColors();
  const { colors } = palette;
  const [range, setRange] = useState(0);
  const current = useMemo(() => data.months.find((m) => m.id === data.currentId) ?? data.months[data.months.length - 1], [data]);

  if (!colors.length) return <ChartSkeleton height={400} />;

  const showCompare = data.channels.length > 0 || data.branches.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Trend charts cover the financial year to date. Month range:
        </p>
        <Seg label="Month range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
      </div>

      <TrendCard months={data.months} range={range} colors={colors} />
      <div className="grid gap-5 xl:grid-cols-2">
        <ExpenseCard data={data} colors={colors} />
        {showCompare && <CompareCard data={data} monthLabel={current?.label ?? ""} palette={palette} />}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <BudgetCards data={data} range={range} colors={colors} budgetHref={budgetHref} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <WorkingCapitalCards months={data.months} range={range} colors={colors} />
      </div>
    </div>
  );
}
