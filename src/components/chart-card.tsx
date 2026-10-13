import type { ReactNode } from "react";

import { ChartEmpty, ChartSkeleton } from "@/components/charts/chart-skeleton";

/**
 * Styled card wrapping a chart with a title. Uses the shared 1.0 panel recipe.
 * `loading` swaps the chart for a skeleton of `height`; `empty` (a message)
 * replaces it when there is nothing to plot.
 */
export function ChartCard({
  title,
  loading = false,
  empty,
  height = 240,
  children,
}: {
  title: string;
  loading?: boolean;
  empty?: ReactNode;
  height?: number;
  children: ReactNode;
}) {
  return (
    <div className="card-surface">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 pt-2">
        {loading ? <ChartSkeleton height={height} /> : empty ? <ChartEmpty>{empty}</ChartEmpty> : children}
      </div>
    </div>
  );
}
