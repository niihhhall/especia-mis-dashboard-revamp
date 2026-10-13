"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { useChartColors } from "@/components/charts/use-chart-colors";
import { fmtPct } from "@/lib/format";
import { useFmtCompact } from "@/components/layout/unit-context";

export interface SegmentChartRow {
  name: string;
  revenue: number;
  grossProfit: number;
  mix: number;
}

const axisProps = (color: string) => ({
  tick: { fill: color, fontSize: 11 },
  axisLine: false,
  tickLine: false,
});

export function SegmentRevenuePie({ data }: { data: SegmentChartRow[] }) {
  const fmtCompact = useFmtCompact();
  const { colors } = useChartColors();
  if (!colors.length) return <ChartSkeleton height={220} />;

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="name"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => fmtCompact(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: colors[i % colors.length] }}
            />
            {d.name} · {fmtPct(d.mix)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SegmentGpBar({ data }: { data: SegmentChartRow[] }) {
  const fmtCompact = useFmtCompact();
  const { colors, axis, sign } = useChartColors();
  if (!colors.length) return <ChartSkeleton height={252} />;

  return (
    <ResponsiveContainer width="100%" height={252}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />
        <XAxis dataKey="name" {...axisProps(axis.text)} />
        <YAxis tickFormatter={(v: number) => fmtCompact(v)} width={72} {...axisProps(axis.text)} />
        <Tooltip formatter={(v) => fmtCompact(Number(v))} cursor={{ fill: axis.cursor }} />
        <Bar dataKey="grossProfit" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.grossProfit >= 0 ? sign.pos : sign.neg} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
