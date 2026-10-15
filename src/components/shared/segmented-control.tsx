"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  title?: string;
}

/**
 * One choice out of a few, every option visible: a 32px ToggleGroup with the
 * selected item on the raised surface. `allowEmpty` lets a click on the
 * selected item clear the choice (`onChange("")`); otherwise that click is
 * ignored. While `pending` the items are `aria-disabled` (focus stays put)
 * and changes are ignored.
 */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  allowEmpty = false,
  pending = false,
  className,
}: {
  /** The group's accessible name. */
  label: string;
  options: SegmentedOption<V>[];
  value: V | "";
  onChange: (value: V | "") => void;
  allowEmpty?: boolean;
  pending?: boolean;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (pending || next === value) return;
        if (next === "" && !allowEmpty) return;
        onChange(next as V | "");
      }}
      className={cn("flex-wrap", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          title={o.title}
          aria-disabled={pending || undefined}
          className="bg-surface text-body text-text-secondary hover:bg-surface-hover hover:text-text-primary aria-disabled:opacity-60 data-[state=on]:bg-surface-raised data-[state=on]:text-text-primary"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
