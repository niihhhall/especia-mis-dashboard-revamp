import type { ReactNode } from "react";

import {
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  Card as UiCard,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The one card: surface, 1px border, 8px radius, 20px padding, a 14px title
 * with an optional muted subtitle and actions on the right. `flush` drops the
 * body padding so a table can run edge to edge.
 */
export function Card({
  title,
  subtitle,
  actions,
  footer,
  flush = false,
  className,
  children,
}: {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const hasHeader = Boolean(title || subtitle || actions);
  return (
    <UiCard
      className={cn(
        "gap-4 rounded-lg border-border bg-surface py-5 text-text-primary",
        className,
      )}
    >
      {hasHeader && (
        <CardHeader className="gap-1 px-5">
          {title && <h2 className="text-card-title text-balance text-text-primary">{title}</h2>}
          {subtitle && <p className="text-body text-pretty text-text-secondary">{subtitle}</p>}
          {actions && <CardAction className="flex items-center gap-2">{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn("min-w-0", flush ? "px-0" : "px-5")}>{children}</CardContent>
      {footer && <CardFooter className="px-5 text-body text-text-secondary">{footer}</CardFooter>}
    </UiCard>
  );
}
