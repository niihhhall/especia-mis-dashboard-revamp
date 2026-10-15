import { KpiStripSkeleton } from "@/components/dashboard/kpi-strip-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** A card-shaped placeholder: title bar, then `rows` bars of `rowClass` height. */
function CardBlock({ rows, rowClass }: { rows: number; rowClass: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 flex flex-col gap-3">
        {range(rows).map((i) => (
          <Skeleton key={i} className={rowClass} />
        ))}
      </div>
    </div>
  );
}

/**
 * Route-level loading state (loading.tsx) in the final page shape, so the
 * layout does not jump when the page streams in: report pages get the header,
 * KPI strip, tab bar and two cards; list pages a header and a table card;
 * forms a header and one card. The pulse stops under reduced motion; the
 * label carries the state for screen readers.
 */
export function PageSkeleton({ variant }: { variant: "report" | "list" | "form" }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading page" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {variant === "report" && (
        <>
          <KpiStripSkeleton cells={10} columns={5} />
          <div className="flex h-9 items-center gap-6 border-b border-border">
            {range(5).map((i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
          <CardBlock rows={6} rowClass="h-5" />
          <CardBlock rows={6} rowClass="h-5" />
        </>
      )}
      {variant === "list" && <CardBlock rows={8} rowClass="h-10" />}
      {variant === "form" && <CardBlock rows={4} rowClass="h-8" />}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
