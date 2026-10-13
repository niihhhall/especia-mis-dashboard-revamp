import Link from "next/link";

import { quartersParam, type Quarter } from "@/lib/mis/quarters";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Apr–Jun" for quarter 1 of an April-start year, etc. — shown as the button's tooltip. */
function monthRange(quarter: Quarter, fyStartMonthNo: number): string {
  const first = (fyStartMonthNo - 1 + (quarter - 1) * 3) % 12;
  return `${MONTHS[first]}–${MONTHS[(first + 2) % 12]}`;
}

/**
 * Q1–Q4 toggle buttons for the month-by-month statements. All four start off (plain monthly columns);
 * switching one on folds that quarter's months into a single column, and several can be on at once.
 * Plain links — the choice lives in `?q=` so a view can be bookmarked or shared, and the buttons are
 * always unselected on a fresh visit. A quarter with no months uploaded is shown dimmed and inert.
 */
export function QuarterFilter({
  selected,
  available,
  fyStartMonthNo,
  buildHref,
}: {
  selected: Quarter[];
  available: Set<Quarter>;
  fyStartMonthNo: number;
  /** The page's own URL for a given set of picked quarters (keeps its other params). */
  buildHref: (quarters: Quarter[]) => string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Fold months into quarters">
      {([1, 2, 3, 4] as Quarter[]).map((q) => {
        const active = selected.includes(q);
        const next = active ? selected.filter((x) => x !== q) : [...selected, q];
        const title = `${monthRange(q, fyStartMonthNo)}${available.has(q) ? "" : " — no months uploaded yet"}`;
        const cls = `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          active
            ? "brand-grad text-white shadow-sm"
            : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        }`;
        if (!available.has(q)) {
          return (
            <span key={q} title={title} aria-disabled="true" className={`${cls} cursor-not-allowed opacity-40`}>
              Q{q}
            </span>
          );
        }
        return (
          <Link
            key={q}
            href={buildHref(next)}
            title={title}
            // A link can't be pressed; it says it's the current choice instead,
            // and the sr-only text carries the state into the name.
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={cls}
            data-quarters={quartersParam(next)}
          >
            Q{q}
            {active && <span className="sr-only">, selected</span>}
          </Link>
        );
      })}
    </div>
  );
}
