import type { ReportTab } from "@/types/report";
import type { ReportKind, ScopeDepth } from "@/lib/data/mis";

/**
 * The report tab bar shared by every MIS screen. Kept beside `nav.ts` rather
 * than inside a component so pages and the sidebar agree on one list.
 *
 * Written unscoped (`/pnl`, not `/c/tirupati/pnl`). `<ReportTabs>` prefixes the
 * open client from the URL, so a page renders the same list whichever company
 * it is showing.
 */
export const REPORT_TABS: ReportTab[] = [
  { href: "/dashboard", label: "Consolidated" },
  { href: "/gp-dashboard", label: "GP Dashboard" },
  { href: "/pnl", label: "P&L Detail" },
  { href: "/segment", label: "Segment P&L" },
  { href: "/book-to-bank", label: "Book to Bank" },
  { href: "/cash-conversion", label: "Cash Conversion" },
  { href: "/debtors", label: "Debtors" },
  { href: "/creditors", label: "Creditors" },
  { href: "/budget-vs-actual", label: "Budget vs Actual" },
  { href: "/charts", label: "Charts" },
];

/**
 * `REPORT_TABS`, minus "Segment P&L" when the open company has zero
 * segments configured — Segment P&L is optional per company (same as
 * Branches), so a company that hasn't set any up shouldn't see a tab that
 * only leads to an empty state. Every report page passes its own
 * `hasSegments` (from a `getMisSegments` fetch it already needs, or a
 * fresh one) through this instead of using `REPORT_TABS` directly.
 */
export function visibleReportTabs(hasSegments: boolean): ReportTab[] {
  return hasSegments ? REPORT_TABS : REPORT_TABS.filter((t) => t.href !== "/segment");
}

/**
 * Which report a tab's href corresponds to, for `withChannelTabs` below —
 * and, just as importantly, which hrefs are deliberately ABSENT from this
 * map. `/book-to-bank` and `/dashboard` are left out on purpose: Book to
 * Bank reconciles to the company's actual bank accounts, which aren't
 * segmented by channel the way P&L/CCC/Segment are, so it always stays one
 * tab regardless of its own `report_scope_config` depth; `/dashboard`
 * ("Consolidated") is meant to always show the whole company, with its
 * existing `BranchScopeSelector` dropdown as the only way to view it at a
 * narrower scope. Omitting a href here is the entire mechanism for keeping
 * a report tab-count-stable — no conditional branching needed at the call
 * site.
 */
const CHANNEL_TAB_KIND: Partial<Record<string, ReportKind>> = {
  "/pnl": "pnl",
  "/cash-conversion": "ccc",
  "/segment": "segment",
};

/** Shorter label for a channel-split tab ("B2C P&L", not "B2C P&L Detail"). */
const CHANNEL_TAB_SHORT_LABEL: Partial<Record<string, string>> = {
  "/pnl": "P&L",
};

/**
 * Splits each channel-eligible tab (per `CHANNEL_TAB_KIND`) into one tab
 * per channel group, but only for a report whose OWN `report_scope_config`
 * depth is `'group'` or `'branch'` — a report still at `'consolidated'`
 * depth keeps its single tab even if the company has channel groups
 * defined for other reports. Each synthesized tab is a real URL
 * (`?scope=group:<id>`) rather than something a click sets client-side —
 * see `getSelectedBranchScope`'s doc comment in `data/mis.ts` for why.
 *
 * Every report page gets this applied through `getReportTabs`
 * (`src/lib/data/report-tabs.ts`), so the split shows on the bar wherever
 * the CA is, not only after opening P&L Detail.
 */
export function withChannelTabs(
  baseTabs: ReportTab[],
  branchGroups: { id: string; label: string }[],
  scopeConfig: Record<ReportKind, ScopeDepth>,
): ReportTab[] {
  if (branchGroups.length === 0) return baseTabs;
  return baseTabs.flatMap((tab) => {
    const kind = CHANNEL_TAB_KIND[tab.href];
    if (!kind || scopeConfig[kind] === "consolidated") return [tab];
    const shortLabel = CHANNEL_TAB_SHORT_LABEL[tab.href] ?? tab.label;
    return branchGroups.map((g) => ({
      href: `${tab.href}?scope=group:${g.id}`,
      label: `${g.label} ${shortLabel}`,
    }));
  });
}
