import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";
import type { KpiDeltaView } from "@/types/kpi";

const ARROW = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight } as const;
const SPOKEN = { up: "up", down: "down", flat: "unchanged" } as const;
const TONE = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-text-secondary",
} as const;

/**
 * A change as plain colored text, no pill: arrow and percent in the tone
 * color, then "favourable" or "adverse" and the caption in text-secondary.
 * Color never carries the meaning alone: the direction is spoken (sr-only)
 * and the verdict is a word.
 */
export function DeltaText({ delta, caption }: { delta: KpiDeltaView; caption?: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-body text-text-secondary">
      <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", TONE[delta.tone])}>
        <Icon icon={ARROW[delta.direction]} size={14} />
        <span className="sr-only">{SPOKEN[delta.direction]}</span> {delta.text}
      </span>
      {delta.verdict && <span>{delta.verdict}</span>}
      {caption && <span>{caption}</span>}
    </p>
  );
}
