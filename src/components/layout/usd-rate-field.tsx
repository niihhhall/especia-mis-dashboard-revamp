"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { fieldTextClass } from "@/lib/ui-classes";
import { DEFAULT_USD_RATE, parseUsdRate } from "@/lib/unit-cookie";

/**
 * The rupees-per-dollar box shown beside the $ unit. The draft is committed on
 * blur or Enter through `parseUsdRate`, which resets anything outside 1 to 1000
 * to the default.
 */
export function UsdRateField({ rate, onCommit }: { rate: number; onCommit: (rate: number) => void }) {
  const [draft, setDraft] = useState(String(rate));

  const commit = () => {
    const next = parseUsdRate(draft);
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <label className="flex items-center gap-2 text-label text-text-secondary">
      ₹/$
      <Input
        type="number"
        inputMode="decimal"
        min={1}
        max={1000}
        step="0.01"
        value={draft}
        // The accessible name starts with the visible "₹/$" (WCAG 2.5.3).
        aria-label="₹/$: rupees per US dollar"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder={String(DEFAULT_USD_RATE)}
        className={`h-8 w-16 bg-surface px-2 text-text-primary tabular-nums md:text-body ${fieldTextClass}`}
      />
    </label>
  );
}
