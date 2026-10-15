import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

/**
 * A calm, centred "nothing here" block: an optional 20px icon, the existing
 * sentence as the title, an optional line of detail and an optional action.
 * `as="h1"` when it stands in for a whole page (guard screens).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <section className={cn("mx-auto flex max-w-lg flex-col items-center py-12 text-center", className)}>
      {icon && (
        <span className="mb-3 text-text-secondary">
          <Icon icon={icon} size={20} />
        </span>
      )}
      <Heading
        className={cn(
          "text-balance text-text-primary",
          Heading === "h1" ? "text-title" : "text-card-title",
        )}
      >
        {title}
      </Heading>
      {description && (
        <div className="mt-2 max-w-prose text-body text-pretty text-text-secondary">{description}</div>
      )}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </section>
  );
}
