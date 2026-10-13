"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useCompanyScope } from "@/components/layout/company-scope";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_COOKIE } from "@/lib/period-cookie";

/**
 * The reporting period, first in every company page header. The choice is
 * saved in a cookie, so every page (all server-rendered from the cookie)
 * follows it across navigation. The selected label prints in its place.
 */
export function PeriodSelector() {
  const { periods, selected } = useCompanyScope();
  const router = useRouter();
  const [pending, start] = useTransition();

  if (periods.length === 0) {
    return <span className="text-body text-text-secondary">No period</span>;
  }

  return (
    <>
      <Select
        value={selected?.id ?? ""}
        onValueChange={(id) => {
          // A change while a refresh runs is ignored; the controlled value
          // stays on the current period.
          if (pending) return;
          document.cookie = `${PERIOD_COOKIE}=${id}; path=/; max-age=31536000`;
          start(() => router.refresh());
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label="Reporting period"
          // aria-disabled keeps focus on the trigger during the refresh.
          aria-disabled={pending || undefined}
          className="border-border bg-surface text-body font-medium text-text-primary aria-disabled:opacity-60 print:hidden"
        >
          <CalendarDays className="size-3.5 text-text-secondary" aria-hidden="true" />
          {/* The label as children, so the server render already shows it
              (the list itself only mounts on the client). */}
          <SelectValue>{selected?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="border-border">
          {periods.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-body">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="hidden text-body font-medium print:inline">{selected?.label}</span>
    </>
  );
}
