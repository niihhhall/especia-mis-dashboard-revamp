import { Skeleton } from "@/components/ui/skeleton";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Placeholder rows in the DataTable shape (52px rows), for a list that is still loading. */
export function DataTableSkeleton({ rows = 8, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading table" className="flex flex-col">
      <div className="flex h-9 items-center gap-6 bg-surface-raised px-5">
        {range(columns).map((c) => (
          <Skeleton key={c} className="h-3 flex-1" />
        ))}
      </div>
      {range(rows).map((r) => (
        <div key={r} className="flex h-13 items-center gap-6 border-b border-border px-5">
          {range(columns).map((c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
