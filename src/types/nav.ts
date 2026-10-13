import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Group heading. Omitted where the list is flat. */
  section?: "Data" | "Reports";
  /**
   * True when `href` is already a company-scoped path (`/pnl`) that needs the
   * active slug prefixed. Firm-level screens, the Companies grid and Profile,
   * are false and stay at the site root.
   */
  scoped?: boolean;
  /**
   * Rendered as `data-nav-item` on the sidebar link. "segment" marks Segment
   * P&L, which globals.css hides on first paint when the open company has no
   * segments (design.md 5.1), before hydration drops it from the list.
   */
  navId?: "segment";
}
