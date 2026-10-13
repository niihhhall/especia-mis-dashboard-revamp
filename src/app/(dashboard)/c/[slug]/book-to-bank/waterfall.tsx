"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/components/charts/use-chart-colors";
import { useFmtCompact } from "@/components/layout/unit-context";

export interface Step {
  label: string;
  value: number;
  type: "start" | "add" | "less" | "end";
}

// A floating waterfall: totals (start/end) rise from the chart floor; deltas
// float between running totals. Works even when the base cash level is a large
// negative (bank OD) because the y-axis is zoomed to the running-total band.
export function BookToBankWaterfall({ steps }: { steps: Step[] }) {
  const fmtCompact = useFmtCompact();
  const { axis, sign } = useChartColors();
  const TOTAL = sign.muted;
  const POS = sign.pos;
  const NEG = sign.neg;

  // Running total after each step (start sets it; end leaves it unchanged).
  const runningAfter = steps.reduce<number[]>((acc, s) => {
    const prev = acc.length ? acc[acc.length - 1] : 0;
    if (s.type === "start") return [...acc, s.value];
    if (s.type === "end") return [...acc, prev];
    return [...acc, prev + s.value];
  }, []);

  const minL = Math.min(...runningAfter);
  const maxL = Math.max(...runningAfter);
  const pad = (maxL - minL) * 0.1 || 1;
  const floor = minL - pad;

  const data = steps.map((s, i) => {
    if (s.type === "start" || s.type === "end") {
      return { label: s.label, base: floor, span: s.value - floor, fill: TOTAL, value: s.value };
    }
    const prev = i === 0 ? 0 : runningAfter[i - 1];
    const curr = runningAfter[i];
    return {
      label: s.label,
      base: Math.min(prev, curr),
      span: Math.abs(s.value),
      fill: s.value >= 0 ? POS : NEG,
      value: s.value,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} tickLine={false} />
        <YAxis
          domain={[floor, maxL + pad]}
          tickFormatter={(v: number) => fmtCompact(v)}
          width={78}
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: axis.cursor }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { label: string; value: number };
            return (
              <div className="rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
                <span className="font-medium">{d.label}: </span>
                <span className={d.value < 0 ? "text-danger" : ""}>{fmtCompact(d.value)}</span>
              </div>
            );
          }}
        />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="span" stackId="a" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
