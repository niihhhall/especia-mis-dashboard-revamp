"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useUnitState } from "@/components/layout/unit-context";
import { UsdRateField } from "@/components/layout/usd-rate-field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UNIT_COOKIE, USD_RATE_COOKIE, type MoneyUnit } from "@/lib/unit-cookie";

type FixedUnit = Exclude<MoneyUnit, "auto">;

const UNITS: { value: FixedUnit; label: string; title: string }[] = [
  { value: "lakh", label: "Lakh", title: "Show every figure in lakh" },
  { value: "crore", label: "Crore", title: "Show every figure in crore" },
  { value: "usd", label: "$", title: "Show every figure in US dollars" },
];

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=31536000`;
}

/**
 * Top bar switch: show every compact figure in Lakh, Crore or US dollars. None
 * selected is the original mixed behaviour; clicking the selected one again
 * returns to it. The choice lives in a cookie, so server pages format with it
 * too and `router.refresh()` re-renders them. While $ is on, the rate field
 * beside it holds the rupees-per-dollar rate (default 88), remembered the same way.
 */
export function UnitSwitch() {
  const { unit, usdRate } = useUnitState();
  const router = useRouter();
  const [pending, start] = useTransition();

  const choose = (value: string) => {
    // aria-disabled keeps focus on the item during the refresh; repeat
    // clicks are ignored here.
    if (pending) return;
    setCookie(UNIT_COOKIE, value === "" ? "auto" : value);
    start(() => router.refresh());
  };

  const commitRate = (rate: number) => {
    if (rate === usdRate) return;
    setCookie(USD_RATE_COOKIE, String(rate));
    start(() => router.refresh());
  };

  return (
    <div className="flex items-center gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-label="Show figures in"
        value={unit === "auto" ? "" : unit}
        onValueChange={choose}
      >
        {UNITS.map(({ value, label, title }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            title={title}
            aria-disabled={pending || undefined}
            className="bg-surface text-body text-text-secondary hover:bg-surface-hover hover:text-text-primary aria-disabled:opacity-60 data-[state=on]:bg-surface-raised data-[state=on]:text-text-primary"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {unit === "usd" && <UsdRateField rate={usdRate} onCommit={commitRate} />}
    </div>
  );
}
