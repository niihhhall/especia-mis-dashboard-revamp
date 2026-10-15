"use client";

import { useState } from "react";

import { BreakdownDonut } from "@/components/dashboard/breakdown-donut";
import { ChartCard } from "@/components/dashboard/chart-card";
import { RankedBarChart } from "@/components/dashboard/ranked-bar-chart";
import { useFmtCompact } from "@/components/layout/unit-context";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { ChartsData, MonthPoint } from "@/lib/data/charts";
import { fmtPct } from "@/lib/format";

import { ChartSelect } from "./chart-select";

const EXPENSE_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "direct_expense", label: "Direct" },
  { value: "indirect_expense", label: "Indirect" },
  { value: "purchase", label: "Purchase" },
] as const;
type Category = (typeof EXPENSE_CATEGORIES)[number]["value"];

const TOP_OPTIONS = [
  { value: "5", label: "Top 5" },
  { value: "8", label: "Top 8" },
  { value: "12", label: "Top 12" },
];

const pct = (v: number, base: number) => (base !== 0 ? (v / base) * 100 : 0);

/** Expense breakdown for one month: the top lines plus "Others", as a donut or ranked bars. */
export function ExpenseCard({ data }: { data: ChartsData }) {
  const fmtCompact = useFmtCompact();
  const [monthId, setMonthId] = useState(data.currentId);
  const [category, setCategory] = useState<Category>("all");
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
  // Today's index order over the six series colors; "Others" stays muted.
  const colorOf = (i: number) => (slices[i]?.key === "others" ? "var(--muted-foreground)" : `var(--chart-${(i % 6) + 1})`);
  const breakdown = slices.map((s, i) => ({
    key: s.key,
    label: s.label,
    value: s.value,
    color: colorOf(i),
    detail: `${fmtCompact(s.value)} · ${fmtPct(s.value / total)}`,
  }));

  return (
    <ChartCard
      title="Expense breakdown"
      subtitle={month ? `${month.label} · ${fmtCompact(total)} across ${items.length} lines` : undefined}
      legend={breakdown.map((s) => ({ name: s.label, color: s.color }))}
      csv={[["Line", "Section", "Amount", "Share %"], ...items.map((e) => [e.label, e.section, e.value.toFixed(2), pct(e.value, total).toFixed(2)])]}
      controls={
        <>
          <ChartSelect
            label="Month"
            value={month?.id ?? ""}
            onChange={setMonthId}
            options={data.months.map((m) => ({ value: m.id, label: m.label }))}
          />
          <ChartSelect label="Category" value={category} onChange={setCategory} options={[...EXPENSE_CATEGORIES]} />
          <SegmentedControl label="Show top" value={String(top)} onChange={(v) => v && setTop(Number(v))} options={TOP_OPTIONS} />
          <SegmentedControl
            label="View"
            value={view}
            onChange={(v) => v && setView(v)}
            options={[{ value: "donut", label: "Donut" }, { value: "bar", label: "Bar" }]}
          />
        </>
      }
      state={!month || slices.length === 0 ? "empty" : "ready"}
      empty={!month ? "No months uploaded yet." : "No expense lines with a positive amount for this selection."}
    >
      {view === "donut" ? (
        <BreakdownDonut items={breakdown} centerValue={fmtCompact(total)} format={fmtCompact} label="Expense breakdown" />
      ) : (
        <RankedBarChart
          rows={breakdown.map((s) => ({ name: s.label, values: { value: s.value }, color: s.color }))}
          format={fmtCompact}
          height={Math.max(200, slices.length * 30 + 40)}
          label="Expense breakdown"
        />
      )}
    </ChartCard>
  );
}
