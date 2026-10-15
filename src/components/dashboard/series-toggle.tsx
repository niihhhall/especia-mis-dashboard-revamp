"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * Series on and off: a multiple ToggleGroup, each item a flat dot plus the
 * series name. At least one series stays selected.
 */
export function SeriesToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; name: string; color: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      size="sm"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next.length > 0) onChange(next);
      }}
      className="flex-wrap"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.key}
          value={o.key}
          className="gap-2 bg-surface text-body text-text-secondary hover:bg-surface-hover hover:text-text-primary data-[state=on]:bg-surface-raised data-[state=on]:text-text-primary"
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: o.color }} />
          {o.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
