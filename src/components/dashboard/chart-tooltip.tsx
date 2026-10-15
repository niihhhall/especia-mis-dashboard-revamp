"use client";

import type { ComponentProps } from "react";

import { ChartTooltipContent } from "@/components/ui/chart";

/**
 * The shared tooltip body: popover surface, 1px border, no shadow, then one
 * row per value with a flat dot, the series or slice name and the value.
 */
export function ChartTip({
  format,
  ...props
}: ComponentProps<typeof ChartTooltipContent> & { format: (v: number) => string }) {
  return (
    <ChartTooltipContent
      {...props}
      className="rounded-md border-border bg-popover text-body"
      formatter={(value, name, item) => (
        <div className="flex w-full items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: item.payload?.fill ?? item.color }}
          />
          <span className="text-text-secondary">{name}</span>
          <span className="num ml-auto pl-3 text-text-primary tabular-nums">{format(Number(value))}</span>
        </div>
      )}
    />
  );
}
