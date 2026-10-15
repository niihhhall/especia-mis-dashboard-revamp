import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder at the strip's final size: per cell a label bar (11px
 * line), a value bar (30px line) and a delta bar (13px line), on the same grid
 * and dividers as KpiStrip.
 */
export function KpiStripSkeleton({ cells, columns }: { cells: number; columns: 4 | 5 }) {
  return (
    <KpiStrip label="Loading key figures" columns={columns}>
      {Array.from({ length: cells }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 bg-surface p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </KpiStrip>
  );
}
