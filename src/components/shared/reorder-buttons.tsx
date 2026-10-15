"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

/**
 * Move up and move down for one row of an ordered list (branches, groups,
 * template lines). Icon buttons with the row's own name in their labels.
 */
export function ReorderButtons({
  itemLabel,
  onUp,
  onDown,
  upDisabled,
  downDisabled,
}: {
  itemLabel: string;
  onUp: () => void;
  onDown: () => void;
  upDisabled: boolean;
  downDisabled: boolean;
}) {
  const cls = "text-text-secondary hover:bg-surface-hover hover:text-text-primary";
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cls}
        onClick={onUp}
        disabled={upDisabled}
        title="Move up"
        aria-label={`Move ${itemLabel} up`}
      >
        <Icon icon={ArrowUp} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cls}
        onClick={onDown}
        disabled={downDisabled}
        title="Move down"
        aria-label={`Move ${itemLabel} down`}
      >
        <Icon icon={ArrowDown} />
      </Button>
    </div>
  );
}
