import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Column count once the strip's own width allows it (container query, so the
 * sidebar state does not matter). Narrower strips use two columns, which
 * divides both 10 and 4 cells evenly. Literal classes so Tailwind sees them.
 */
const COLUMNS = {
  4: "@2xl:grid-cols-4",
  5: "@3xl:grid-cols-5",
} as const;

/**
 * KPI cells in one bordered row with 1px dividers. The dividers are the
 * border color showing through a 1px grid gap, so every cell in a row has the
 * same height and the lines stay aligned however the cells wrap.
 */
export function KpiStrip({ label, columns, children }: { label: string; columns: 4 | 5; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="@container">
      <div
        className={cn(
          "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border",
          COLUMNS[columns],
        )}
      >
        {children}
      </div>
    </div>
  );
}
