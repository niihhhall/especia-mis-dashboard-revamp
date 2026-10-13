/**
 * Placeholder the size of the chart it stands in for, shown until the chart
 * colours resolve (or while a card's data loads). Named, so a screen reader
 * hears "Loading chart" instead of an empty gap.
 */
export function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      aria-busy="true"
      className="w-full animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
      style={{ height }}
    />
  );
}

/** The empty slot of a chart card: one centred line where the chart would be. */
export function ChartEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}
