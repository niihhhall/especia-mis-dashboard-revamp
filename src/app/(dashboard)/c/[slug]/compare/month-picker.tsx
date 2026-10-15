"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Opt {
  id: string;
  label: string;
}

/**
 * Two month selectors that drive the comparison through the URL, so a specific
 * comparison can be linked or bookmarked rather than living in local state.
 */
export function MonthPicker({ periods, left, right }: { periods: Opt[]; left: string; right: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const id = useId();

  // Stay on the current company's compare page (`/c/<slug>/compare`); a bare
  // `/compare` has no route and 404s.
  const set = (key: "a" | "b", value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    start(() => router.push(`${pathname}?${next.toString()}`));
  };

  // The month already chosen on the other side is disabled, so the two sides
  // can never be the same month (every change would read zero).
  const picker = (label: string, key: "a" | "b", value: string, other: string) => (
    <div className="flex items-center gap-2">
      <span id={`${id}-${key}`} className="text-body text-text-secondary">
        {label}
      </span>
      <Select value={value} disabled={pending} onValueChange={(v) => set(key, v)}>
        <SelectTrigger size="sm" aria-labelledby={`${id}-${key}`} className="h-8 rounded-md text-body">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="border-border">
          {periods.map((p) => (
            <SelectItem key={p.id} value={p.id} disabled={p.id === other} className="text-body">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {picker("Baseline", "b", left, right)}
      <span className="text-body text-text-secondary">vs</span>
      {picker("Compare", "a", right, left)}
    </div>
  );
}
