import type { ReactNode } from "react";

/**
 * The one header every dashboard page starts with: the page's own title and
 * subtitle on the left, its period selector, filters and actions on the
 * right. It sits 24px below the top bar (the `main` top padding) and keeps
 * 24px to the content below it.
 */
export function PageHeader({
  title,
  subtitle,
  leading,
  meta,
  filters,
  actions,
}: {
  /** The page's existing h1 text. */
  title: ReactNode;
  /** The page's existing one-line subtitle. */
  subtitle?: ReactNode;
  /** Dashboard only: the company avatar. */
  leading?: ReactNode;
  /** Dashboard only: status, address, registration numbers, "Prepared by". */
  meta?: ReactNode;
  /** PeriodSelector first on company pages, then the page's existing filters. */
  filters?: ReactNode;
  /** The page's existing actions, for example "New company". */
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-6">
      <div className="flex min-w-0 items-start gap-4">
        {leading}
        <div className="min-w-0">
          <h1 className="text-title break-words text-balance text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-body text-pretty text-text-secondary">{subtitle}</p>}
          {meta}
        </div>
      </div>
      {(filters || actions) && (
        <div className="flex flex-wrap items-center gap-3">
          {filters}
          {actions}
        </div>
      )}
    </header>
  );
}
