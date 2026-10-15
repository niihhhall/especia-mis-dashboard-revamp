"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SegmentedControl } from "@/components/shared/segmented-control";
import { PERIOD_COOKIE } from "@/lib/period-cookie";

export interface PeriodOption {
  id: string;
  label: string;
}

/**
 * Month picker for the editing screens: Master TB and Adjustments.
 *
 * The header already carries a month dropdown, but on a screen where typing a
 * number rewrites a client's accounts, which month is being edited should not
 * live in a collapsed control at the far corner of the page. Every month stays
 * visible in one segmented control, so the active month is readable without
 * opening anything and one click away from any other.
 *
 * Writes the same cookie as the header selector, so the two stay in step and
 * the choice follows the user onto the reports.
 */
export function PeriodPicker({
  periods,
  current,
  label = "Month",
}: {
  periods: PeriodOption[];
  current: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (periods.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="text-label text-text-secondary">{label}</span>
      <SegmentedControl
        label={label}
        pending={pending}
        value={current}
        // Oldest first: an accountant reads a financial year left to right.
        options={[...periods].reverse().map((p) => ({ value: p.id, label: p.label }))}
        onChange={(id) => {
          // Written inside the transition so the compiler sees the browser
          // write as part of the update, not as a stray mutation.
          start(() => {
            document.cookie = `${PERIOD_COOKIE}=${id}; path=/; max-age=31536000`;
            router.refresh();
          });
        }}
      />
    </div>
  );
}
