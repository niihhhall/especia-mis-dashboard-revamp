"use client";

import { useState } from "react";

import { ChartCard } from "@/components/dashboard/chart-card";
import { RankedBarChart } from "@/components/dashboard/ranked-bar-chart";
import { useFmtCompact } from "@/components/layout/unit-context";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { ChartsData, CompareRow } from "@/lib/data/charts";
import { trimCommonPrefix } from "@/lib/mis/charts";

import { ChartSelect } from "./chart-select";

const COMPARE_METRICS = [
  { value: "revenue", label: "Revenue" },
  { value: "grossProfit", label: "Gross profit" },
  { value: "ebitda", label: "EBITDA" },
  { value: "ebt", label: "EBT" },
  { value: "margin", label: "EBT margin %" },
] as const;
type Metric = (typeof COMPARE_METRICS)[number]["value"];

const pct = (v: number, base: number) => (base !== 0 ? (v / base) * 100 : 0);
const fmtPctPoints = (v: number) => `${v.toFixed(1)}%`;

/** Channel or branch comparison for the selected month, ranked by the chosen metric. */
export function CompareCard({ data, monthLabel }: { data: ChartsData; monthLabel: string }) {
  const fmtCompact = useFmtCompact();
  const hasChannels = data.channels.length > 0;
  const hasBranches = data.branches.length > 0;
  const [kind, setKind] = useState<"channels" | "branches">(hasChannels ? "channels" : "branches");
  const [metric, setMetric] = useState<Metric>("revenue");

  const channels = kind === "channels" && hasChannels;
  const source: CompareRow[] = channels ? data.channels : data.branches;
  const names = channels ? source.map((r) => r.name) : trimCommonPrefix(source.map((r) => r.name));
  const valueOf = (r: CompareRow) => (metric === "margin" ? pct(r.ebt, r.revenue) : r[metric]);
  const rows = source
    .map((r, i) => ({ name: names[i], full: r.name, value: valueOf(r) }))
    .sort((a, b) => b.value - a.value);
  const fmt = metric === "margin" ? fmtPctPoints : fmtCompact;
  const signed = metric !== "revenue";

  return (
    <ChartCard
      title={channels ? "Channel comparison" : "Branch comparison"}
      subtitle={`${monthLabel} · ${COMPARE_METRICS.find((m) => m.value === metric)?.label}`}
      legend={
        signed
          ? [{ name: "Positive", color: "var(--positive)" }, { name: "Negative", color: "var(--negative)" }]
          : [{ name: "Revenue", color: "var(--chart-1)" }]
      }
      showLegend
      csv={[["Name", "Revenue", "Gross profit", "EBITDA", "EBT"], ...source.map((r) => [r.name, r.revenue.toFixed(2), r.grossProfit.toFixed(2), r.ebitda.toFixed(2), r.ebt.toFixed(2)])]}
      controls={
        <>
          {hasChannels && hasBranches && (
            <SegmentedControl
              label="Compare"
              value={kind}
              onChange={(v) => v && setKind(v)}
              options={[{ value: "channels", label: "Channels" }, { value: "branches", label: "Branches" }]}
            />
          )}
          <ChartSelect label="Metric" value={metric} onChange={setMetric} options={[...COMPARE_METRICS]} />
        </>
      }
    >
      <RankedBarChart
        rows={rows.map((r) => ({ name: r.name, full: r.full, values: { value: r.value } }))}
        format={fmt}
        signed={signed}
        height={Math.max(220, rows.length * 32 + 40)}
        label={channels ? "Channel comparison" : "Branch comparison"}
      />
    </ChartCard>
  );
}
