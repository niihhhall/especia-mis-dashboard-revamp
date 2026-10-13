"use client";

import { useState } from "react";

export interface Opt {
  id: string;
  label: string;
}

/**
 * Download the full pack for a month other than the one in view, without
 * having to switch the header period selector first.
 */
export function PeriodDownloads({
  periods,
  currentId,
  companySlug,
}: {
  periods: Opt[];
  currentId: string;
  /** Route Handlers sit outside `/c/[slug]`, so the company travels in the query. */
  companySlug: string;
}) {
  const [id, setId] = useState(currentId);
  if (periods.length < 2) return null;

  return (
    <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Download an earlier month</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The complete pack for any published month.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          aria-label="Month to download"
          className="h-9 rounded-lg border border-border bg-card px-3 text-base font-medium text-foreground sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <a
          href={`/export/xlsx?company=${encodeURIComponent(companySlug)}&period=${id}`}
          className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Download {periods.find((p) => p.id === id)?.label} pack
        </a>
      </div>
    </div>
  );
}
