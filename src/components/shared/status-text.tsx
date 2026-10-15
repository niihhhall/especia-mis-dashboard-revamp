import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A status, role or count as plain words instead of a colored pill: muted by
 * default, text-primary at weight 500 when it needs emphasis.
 */
export function StatusText({
  emphasis = false,
  className,
  children,
}: {
  emphasis?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-label",
        emphasis ? "font-medium text-text-primary" : "text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}
