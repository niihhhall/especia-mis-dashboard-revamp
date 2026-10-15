import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder the size of the chart it stands in for. Named, so a screen
 * reader hears "Loading chart" instead of an empty gap.
 */
export function ChartSkeleton({ height }: { height: number }) {
  return (
    <Skeleton
      role="status"
      aria-label="Loading chart"
      aria-busy="true"
      className="w-full rounded-md bg-surface-raised"
      style={{ height }}
    />
  );
}
