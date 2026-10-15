import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SegmentedLinkOption {
  href: string;
  label: string;
  active: boolean;
  /** Shown dimmed and inert, with its title still readable on hover. */
  disabled?: boolean;
  title?: string;
  /** Extra `data-*` attributes the page already puts on the link. */
  data?: Record<`data-${string}`, string>;
}

const item =
  "inline-flex h-8 items-center px-3 text-body font-medium whitespace-nowrap border-s border-border first:border-s-0";

/**
 * A row of links drawn as one 32px segmented control. They stay links, so
 * the choice lives in the URL and can be bookmarked; the current one says so
 * with `aria-current` plus an optional sr-only suffix in its name.
 */
export function SegmentedLinks({
  label,
  options,
  activeSuffix,
  className,
}: {
  /** The group's accessible name. */
  label: string;
  options: SegmentedLinkOption[];
  /** Read after an active option's label, for example ", selected". */
  activeSuffix?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex w-fit overflow-hidden rounded-md border border-border bg-surface", className)}
    >
      {options.map((o) => {
        if (o.disabled) {
          return (
            <span
              key={o.href + o.label}
              title={o.title}
              aria-disabled="true"
              className={cn(item, "cursor-not-allowed text-text-muted")}
              {...o.data}
            >
              {o.label}
            </span>
          );
        }
        return (
          <Link
            key={o.href + o.label}
            href={o.href}
            title={o.title}
            aria-current={o.active ? "true" : undefined}
            scroll={false}
            className={cn(
              item,
              o.active
                ? "bg-surface-raised text-text-primary"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
            )}
            {...o.data}
          >
            {o.label}
            {o.active && activeSuffix && <span className="sr-only">{activeSuffix}</span>}
          </Link>
        );
      })}
    </div>
  );
}
