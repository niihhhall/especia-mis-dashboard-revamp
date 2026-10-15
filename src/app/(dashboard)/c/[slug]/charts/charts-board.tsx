"use client";

import { useMemo, useState } from "react";

import { SegmentedControl } from "@/components/shared/segmented-control";
import type { ChartsData } from "@/lib/data/charts";

import { BudgetCards } from "./budget-cards";
import { CompareCard } from "./compare-card";
import { ExpenseCard } from "./expense-card";
import { TrendCard } from "./trend-card";
import { WorkingCapitalCards } from "./working-capital-cards";

const RANGE_OPTIONS = [
  { value: "3", label: "3 mo" },
  { value: "6", label: "6 mo" },
  { value: "12", label: "12 mo" },
  { value: "0", label: "All" },
];

/** The Charts page: the shared month range and the card order. Each card owns its own controls. */
export function ChartsBoard({ data, budgetHref }: { data: ChartsData; budgetHref: string }) {
  const [range, setRange] = useState(0);
  const current = useMemo(() => data.months.find((m) => m.id === data.currentId) ?? data.months[data.months.length - 1], [data]);
  const showCompare = data.channels.length > 0 || data.branches.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-5 py-3">
        <p className="text-body text-text-secondary">Trend charts cover the financial year to date. Month range:</p>
        <SegmentedControl label="Month range" value={String(range)} onChange={(v) => v && setRange(Number(v))} options={RANGE_OPTIONS} />
      </div>

      <TrendCard months={data.months} range={range} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ExpenseCard data={data} />
        {showCompare && <CompareCard data={data} monthLabel={current?.label ?? ""} />}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <BudgetCards data={data} range={range} budgetHref={budgetHref} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <WorkingCapitalCards months={data.months} range={range} />
      </div>
    </div>
  );
}
