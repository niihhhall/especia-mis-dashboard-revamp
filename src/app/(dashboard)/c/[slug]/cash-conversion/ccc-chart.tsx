"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { useChartColors } from "@/components/charts/use-chart-colors";

export interface CccBar {
  name: string;
  value: number;
  emphasis?: boolean;
}

const axisProps = (color: string) => ({
  tick: { fill: color, fontSize: 11 },
  axisLine: false,
  tickLine: false,
});

export function CccComponentsChart({ data }: { data: CccBar[] }) {
  const { colors, axis } = useChartColors();
  if (!colors.length) return <ChartSkeleton height={280} />;

  // chart-1 (sky) carries the headline CCC bar; chart-5 (teal) the components.
  const [accent, , , , base] = colors;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={axis.grid} vertical={false} />
        <XAxis dataKey="name" interval={0} {...axisProps(axis.text)} />
        <YAxis tickFormatter={(v: number) => `${v}d`} width={44} {...axisProps(axis.text)} />
        <Tooltip formatter={(v) => `${Number(v)} days`} cursor={{ fill: axis.cursor }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.emphasis ? accent : base} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => `${Number(v)}d`}
            className="fill-foreground text-xs"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
