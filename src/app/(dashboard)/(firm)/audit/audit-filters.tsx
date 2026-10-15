"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Radix Select items cannot hold "", so "all" stands for it and the hidden field submits "" as before. */
const ALL = "__all";

function FilterSelect({
  name,
  label,
  allLabel,
  initial,
  options,
}: {
  name: string;
  label: string;
  allLabel: string;
  initial: string;
  options: { value: string; label: string }[];
}) {
  const [value, setValue] = useState(initial || ALL);
  return (
    <>
      <input type="hidden" name={name} value={value === ALL ? "" : value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger size="sm" aria-label={label} className="h-8 rounded-md text-body">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="max-h-80 border-border">
          <SelectItem value={ALL} className="text-body">
            {allLabel}
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-body">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

/** The action and company filters, submitted as the same GET query strings as before. */
export function AuditFilters({
  action,
  company,
  actions,
  companies,
}: {
  action: string;
  company: string;
  actions: { value: string; label: string }[];
  companies: { value: string; label: string }[];
}) {
  return (
    <form className="flex flex-wrap items-center gap-2" method="get">
      <FilterSelect name="action" label="Action" allLabel="All actions" initial={action} options={actions} />
      <FilterSelect name="company" label="Company" allLabel="All companies" initial={company} options={companies} />
      <Button type="submit" variant="outline" size="sm" className="h-8 rounded-md text-body">
        Filter
      </Button>
    </form>
  );
}
