/**
 * Route-level loading state (loading.tsx): the shape of a report page — title,
 * KPI row, table — so the layout doesn't jump when the page streams in. The
 * pulse stops under reduced motion; the label carries the state for screen
 * readers.
 */
export function PageSkeleton() {
  const block = "rounded-lg bg-muted animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2">
        <div className={`${block} h-7 w-56`} />
        <div className={`${block} h-4 w-80 max-w-full`} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`${block} h-24`} />
        ))}
      </div>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className={`${block} h-8`} />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${block} h-6`} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
