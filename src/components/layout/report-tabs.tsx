"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { companyPath, companySlugFromPath } from "@/lib/company-scope";
import type { ReportTab } from "@/types/report";

/**
 * The report tab bar: real links (a report can be linked, bookmarked and
 * reached with the back button), drawn as underline tabs. A per-channel tab
 * (`/pnl?scope=group:<id>`, see `withChannelTabs` in `report-tabs.ts`) is a
 * real URL too, so it is as shareable as any other tab.
 *
 * `tabs` arrives unscoped and is resolved against the client in the URL here,
 * so the report pages that render this bar never have to know the slug.
 *
 * The bar scrolls sideways instead of wrapping, and the active tab is scrolled
 * into view, so a company with many channel tabs never pushes the page wide.
 */
export function ReportTabs({ tabs }: { tabs: ReportTab[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const slug = companySlugFromPath(pathname);
  // A branch picked from inside a channel carries that channel in `?ch=`, so
  // the channel's own tab stays lit (and a branch picked company-wide keeps
  // the plain tab lit) instead of no tab looking active at all.
  const rawScope = searchParams.get("scope");
  const channel = searchParams.get("ch");
  const currentScope = rawScope?.startsWith("branch:")
    ? channel
      ? `group:${channel}`
      : null
    : rawScope === "consolidated"
      ? null
      : rawScope;

  // Keep the active tab in view when the bar is wider than the page. Only the
  // bar scrolls (never the page), and it runs again once the fonts settle,
  // because the tab widths change when Geist replaces the fallback font.
  useEffect(() => {
    const tab = activeRef.current;
    const bar = tab?.closest("ul");
    if (!tab || !bar) return;
    const reveal = () => {
      const b = bar.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      if (t.left < b.left) bar.scrollLeft += t.left - b.left;
      else if (t.right > b.right) bar.scrollLeft += t.right - b.right;
    };
    reveal();
    void document.fonts.ready.then(reveal);
  }, [pathname, currentScope]);

  return (
    <nav aria-label="Reports" className="min-w-0 flex-[1_1_20rem] print:hidden">
      <ul className="scrollbar-thin flex gap-6 overflow-x-auto overscroll-x-contain border-b border-border">
        {tabs.map((t) => {
          // A channel tab's own href carries `?scope=group:<id>`; `usePathname()`
          // never includes the query string, so matching on path alone would
          // make every channel tab for the same report look identical (and
          // never active). Split path from query once, compare both.
          const [rawPath, rawQuery] = t.href.split("?");
          const resolvedPath = slug ? companyPath(slug, rawPath) : rawPath;
          const tabScope = rawQuery ? new URLSearchParams(rawQuery).get("scope") : null;
          const active = pathname === resolvedPath && tabScope === currentScope;
          const href = slug ? companyPath(slug, t.href) : t.href;
          // The underline sits inside the link (bottom-0): the scrolling list
          // clips anything drawn over its own bottom border.
          return (
            <li key={t.href} className="shrink-0">
              <Link
                ref={active ? activeRef : undefined}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative inline-flex h-9 items-center whitespace-nowrap text-body font-medium text-text-secondary hover:text-text-primary aria-[current=page]:text-text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 aria-[current=page]:after:bg-brand"
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
