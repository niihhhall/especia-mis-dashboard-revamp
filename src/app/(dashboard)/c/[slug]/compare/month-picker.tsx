"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export interface Opt {
  id: string;
  label: string;
}

/**
 * Two month selectors that drive the comparison through the URL, so a specific
 * comparison can be linked or bookmarked rather than living in local state.
 */
export function MonthPicker({
  periods,
  left,
  right,
}: {
  periods: Opt[];
  left: string;
  right: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  // Stay on the current company's compare page (`/c/<slug>/compare`); a bare
  // `/compare` has no route and 404s.
  const set = (key: "a" | "b", value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    start(() => router.push(`${pathname}?${next.toString()}`));
  };

  const select =
    "h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

  // The month already chosen on the other side is disabled, so the two sides
  // can never be the same month (every change would read ₹0).
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Baseline
        <select
          className={select}
          value={left}
          disabled={pending}
          onChange={(e) => set("b", e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === right}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <span className="text-muted-foreground">vs</span>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Compare
        <select
          className={select}
          value={right}
          disabled={pending}
          onChange={(e) => set("a", e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === left}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
