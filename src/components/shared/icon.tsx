import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one way to draw a lucide icon: 16px by default (14px inside small
 * controls, 20px for empty states), stroke from the global `.lucide` rule,
 * color from `currentColor`. Decorative unless it gets a `label`.
 */
export function Icon({
  icon: Glyph,
  size = 16,
  label,
  className,
}: {
  icon: LucideIcon;
  size?: 14 | 16 | 20;
  /** Accessible name, only for an icon that carries meaning on its own. */
  label?: string;
  className?: string;
}) {
  return (
    <Glyph
      size={size}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("shrink-0", className)}
    />
  );
}
