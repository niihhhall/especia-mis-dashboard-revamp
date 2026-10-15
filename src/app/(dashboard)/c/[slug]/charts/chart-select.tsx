"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** A 32px Select for a chart card's own controls (month, category, metric). */
export function ChartSelect<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  /** The accessible name. */
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as V)}>
      <SelectTrigger size="sm" aria-label={label} className="border-border bg-surface text-body font-medium text-text-primary">
        {/* The label as children, so the server render already shows it. */}
        <SelectValue>{current?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="border-border">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-body">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
