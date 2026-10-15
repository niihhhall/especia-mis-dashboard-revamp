"use client";

import { Undo2 } from "lucide-react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/lib/ui-classes";

/**
 * The grouping picker for one ledger: a native select over the known
 * groupings plus "New grouping…", which swaps in a text field with an undo
 * button back to the list.
 */
export function GroupingSelect({
  ledger,
  grouping,
  custom,
  groupings,
  onChange,
  onCustom,
  onBack,
}: {
  ledger: string;
  grouping: string;
  custom: boolean;
  groupings: string[];
  onChange: (v: string) => void;
  onCustom: () => void;
  onBack: () => void;
}) {
  if (custom) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={grouping}
          onChange={(e) => onChange(e.target.value)}
          placeholder="New grouping name"
          aria-label={`New grouping for ${ledger}`}
          className={`${fieldClass} w-48`}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Back to list"
          aria-label="Back to grouping list"
          onClick={onBack}
          className="size-8 rounded-md text-text-secondary hover:text-text-primary"
        >
          <Icon icon={Undo2} />
        </Button>
      </div>
    );
  }
  return (
    <select
      value={grouping}
      onChange={(e) => (e.target.value === "__new__" ? onCustom() : onChange(e.target.value))}
      aria-label={`Grouping for ${ledger}`}
      className={`${fieldClass} w-56 ${grouping === "" ? "border-border-strong text-text-secondary" : ""}`}
    >
      {/* Forces a deliberate pick: an unmapped ledger starts with nothing
          selected rather than silently defaulting to Other Expenses. */}
      {grouping === "" && (
        <option value="" disabled>
          - Choose grouping -
        </option>
      )}
      {!groupings.includes(grouping) && grouping !== "" && <option value={grouping}>{grouping}</option>}
      {groupings.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
      <option value="__new__">New grouping…</option>
    </select>
  );
}
