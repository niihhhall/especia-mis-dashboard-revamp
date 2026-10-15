import { Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

/**
 * A quiet one-line notice: 1px border, 6px radius, raised surface, a 16px
 * icon in text-secondary and the message in text-primary. No tint.
 */
export function Notice({
  icon = Info,
  className,
  children,
}: {
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-body text-text-primary",
        className,
      )}
    >
      <span className="flex h-5 items-center text-text-secondary">
        <Icon icon={icon} />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
