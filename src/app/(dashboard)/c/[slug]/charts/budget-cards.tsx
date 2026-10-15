"use client";

import Link from "next/link";
import { useState } from "react";

import { ChartCard } from "@/components/dashboard/chart-card";
import { RankedBarChart } from "@/components/dashboard/ranked-bar-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { useFmtCompact } from "@/components/layout/unit-context";
import { Card } from "@/components/shared/card";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { ChartsData } from "@/lib/data/charts";
import type { ChartMode, ChartRow, SeriesDef } from "@/types/chart";

import { ChartSelect } from "./chart-select";

const BUDGET_METRICS = [
  { value: "revenue", label: "Revenue" },
  { value: "cogs", label: "COGS" },
  { value: "grossProfit", label: "Gross profit" },
  { value: "indirectExpense", label: "Indirect expense" },
  { value: "ebitda", label: "EBITDA" },
  { value: "ebt", label: "EBT" },
] as const;
type Metric = (typeof BUDGET_METRICS)[number]["value"];

const REVENUE_TYPE = new Set(["revenue", "indirect_income"]);
// Budget first, as today; the accent stays on Actual.
const SERIES: SeriesDef[] = [
  { key: "budget", label: "Budget", color: "var(--chart-2)" },
  { key: "actual", label: "Actual", color: "var(--chart-1)" },
];
const LEGEND = SERIES.map((s) => ({ name: s.label, color: s.color }));
const lastN = <T,>(rows: T[], n: number): T[] => (n > 0 ? rows.slice(-n) : rows);
const csvOf = (head: string, rows: ChartRow[]) => [
  [head, "Budget", "Actual"],
  ...rows.map((r) => [r.label as string, r.budget == null ? "" : Number(r.budget).toFixed(2), Number(r.actual).toFixed(2)]),
];

/** Budget vs Actual: by month, by section for the selected month, and its biggest variances. */
export function BudgetCards({ data, range, budgetHref }: { data: ChartsData; range: number; budgetHref: string }) {
  const fmtCompact = useFmtCompact();
  const [metric, setMetric] = useState<Metric>("revenue");
  const [type, setType] = useState<ChartMode>("bar");

  if (!data.hasBudget) {
    return (
      <Card title="Budget vs actual">
        <p className="text-body text-pretty text-text-secondary">
          No budget has been entered yet.{" "}
          <Link href={budgetHref} className="font-medium text-text-primary underline">
            Upload a Budget template
          </Link>{" "}
          to see monthly, by-section and top-variance charts here.
        </p>
      </Card>
    );
  }

  const label = BUDGET_METRICS.find((m) => m.value === metric)?.label ?? "";
  const monthRows: ChartRow[] = lastN(data.months, range).map((m) => ({ label: m.label, budget: m.budget ? m.budget[metric] : null, actual: m[metric] }));
  const current = data.months.find((m) => m.id === data.currentId) ?? data.months[data.months.length - 1];
  const sectionRows: ChartRow[] = BUDGET_METRICS.map((m) => ({
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
      <ChartCard
        title="Budget vs actual by month"
        subtitle={label}
        legend={LEGEND}
        showLegend
        csv={csvOf("Month", monthRows)}
        controls={
          <>
            <ChartSelect label="Metric" value={metric} onChange={setMetric} options={[...BUDGET_METRICS]} />
            <SegmentedControl
              label="Chart type"
              value={type}
              onChange={(v) => v && setType(v)}
              options={[{ value: "bar", label: "Bar" }, { value: "line", label: "Line" }]}
            />
          </>
        }
      >
        <TrendChart data={monthRows} series={SERIES} mode={type} format={fmtCompact} label="Budget vs actual by month" />
      </ChartCard>

      <ChartCard title={`${current.label}: Budget vs actual by section`} legend={LEGEND} showLegend csv={csvOf("Section", sectionRows)}>
        <RankedBarChart
          rows={sectionRows.map((r) => ({ name: r.label as string, values: { budget: r.budget as number | null, actual: r.actual as number } }))}
          series={SERIES}
          format={fmtCompact}
          height={Math.max(270, sectionRows.length * 48 + 40)}
          label={`${current.label}: Budget vs actual by section`}
        />
      </ChartCard>

      <ChartCard
        title={`${current.label}: biggest variances`}
        subtitle="Actual minus budget · green is favourable, red is unfavourable"
        legend={[{ name: "Favourable", color: "var(--positive)" }, { name: "Unfavourable", color: "var(--negative)" }]}
        showLegend
        csv={[["Line", "Variance", "Favourable"], ...variance.map((v) => [v.name, v.value.toFixed(2), v.favorable ? "yes" : "no"])]}
        state={variance.length === 0 ? "empty" : "ready"}
        empty="No line differs from its budget for this month."
      >
        <RankedBarChart
          rows={variance.map((v) => ({ name: v.name, values: { value: v.value }, favorable: v.favorable }))}
          series={[{ key: "value", label: "Variance", color: "var(--chart-1)" }]}
          format={fmtCompact}
          signed
          height={Math.max(220, variance.length * 32 + 40)}
          label={`${current.label}: biggest variances`}
        />
      </ChartCard>
    </>
  );
}
