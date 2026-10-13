"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PERIOD_COOKIE } from "@/lib/period-cookie";

export interface PeriodOption {
  id: string;
  label: string;
}

/**
 * Month picker for the editing screens — Master TB and Adjustments.
 *
 * The header already carries a month dropdown, but on a screen where typing a
 * number rewrites a client's accounts, which month is being edited should not
 * live in a collapsed control at the far corner of the page. Laid out as
 * visible pills, the active month is readable without opening anything and one
 * click away from any other.
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
    <div
      className={`flex flex-wrap items-center gap-2 print:hidden ${pending ? "opacity-60" : ""}`}
      role="group"
      aria-label={label}
    >
      <span className="text-overline font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      {/* Oldest first: an accountant reads a financial year left to right. */}
      {[...periods].reverse().map((p) => {
        const active = p.id === current;
        return (
          <button
            key={p.id}
            type="button"
            // aria-disabled, not disabled: a disabled button drops keyboard
            // focus to <body> mid-refresh. Clicks are ignored while pending.
            aria-disabled={pending || undefined}
            aria-pressed={active}
            onClick={() => {
              if (active || pending) return;
              // Written inside the transition so the compiler sees the browser
              // write as part of the update, not as a stray mutation.
              start(() => {
                document.cookie = `${PERIOD_COOKIE}=${p.id}; path=/; max-age=31536000`;
                router.refresh();
              });
            }}
            className={`h-8 rounded-lg px-3 text-ui font-semibold transition-colors ${
              active
                ? "brand-grad text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
