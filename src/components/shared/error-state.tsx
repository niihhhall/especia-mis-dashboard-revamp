"use client";

import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * What failed in plain words, a retry where one is possible and an optional
 * way out. The defaults are the route boundary copy; cards pass their own.
 * The raw error stays in the console: in production a Server Component error
 * only carries a digest anyway, shown here as the reference.
 */
export function ErrorState({
  title = "This page didn\u2019t load",
  message = "Something went wrong while loading it. Try again, or go back to the companies list.",
  reference,
  onRetry,
  retryLabel = "Try again",
  action,
  as: Heading = "h2",
  className,
}: {
  title?: string;
  message?: ReactNode;
  /** The error digest, matched against the server logs. */
  reference?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <section
      role="alert"
      className={cn("mx-auto flex max-w-lg flex-col items-center py-12 text-center", className)}
    >
      <Heading
        className={cn(
          "text-balance text-text-primary",
          Heading === "h1" ? "text-title" : "text-card-title",
        )}
      >
        {title}
      </Heading>
      <p className="mt-2 max-w-prose text-body text-pretty text-text-secondary">{message}</p>
      {reference && <p className="mt-2 text-label text-text-secondary">Reference: {reference}</p>}
      {(onRetry || action) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button type="button" size="sm" className="text-body" onClick={() => onRetry()}>
              <Icon icon={RotateCw} />
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </section>
  );
}
