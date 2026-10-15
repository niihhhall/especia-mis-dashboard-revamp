import {
  Building2,
  ChartColumn,
  ChartPie,
  ClipboardCheck,
  FileDown,
  FileText,
  GitBranch,
  GitCompareArrows,
  History,
  Landmark,
  Layers,
  LayoutDashboard,
  MessagesSquare,
  Monitor,
  RefreshCw,
  ScrollText,
  SlidersHorizontal,
  Table2,
  Target,
  Truck,
  Upload,
  Users,
  UserCog,
  UserRound,
  Wallet,
  Waypoints,
} from "lucide-react";

// NOTE: the AppRole import must stay type-only. `auth/session` is `server-only`
// and the sidebar consuming this is a client component, a value import would
// drag server code into the browser bundle and break the build.
import type { AppRole } from "@/lib/auth/session";
import { companyPath } from "@/lib/company-scope";
import type { NavItem } from "@/types/nav";

/**
 * A client sees their own portal, their dashboard, their history, their
 * queries. Staff see the firm first: a list of clients, then one client's
 * working screens once they pick one.
 *
 * Hiding a link is presentation only. Access is refused server-side by the
 * `(data)` route-group guard, the `/c/[slug]` guard and by RLS; this just keeps
 * the UI honest.
 */
const COMPANY_NAV: NavItem[] = [
  { href: "/dashboard", label: "My dashboard", icon: LayoutDashboard, scoped: true },
  { href: "/gp-dashboard", label: "GP dashboard", icon: Monitor, scoped: true },
  { href: "/history", label: "MIS history", icon: History, scoped: true },
  { href: "/compare", label: "Compare months", icon: GitCompareArrows, scoped: true },
  { href: "/reports", label: "Reports", icon: FileDown, scoped: true },
  { href: "/queries", label: "Notes & queries", icon: MessagesSquare, scoped: true },
  { href: "/profile", label: "Profile", icon: UserRound },
];

/**
 * Firm-level navigation, shown whenever no client is open.
 *
 * Upload, Reports and Queries point at the unscoped chooser, which lists the
 * clients and hands off to the same screen scoped to one of them, the flow the
 * 1.0 portal has, where MIS Upload starts by asking which company.
 */
const FIRM_NAV: NavItem[] = [
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/review", label: "Review queue", icon: ClipboardCheck },
  { href: "/upload", label: "MIS upload", icon: Upload },
  { href: "/queries", label: "Notes & queries", icon: MessagesSquare },
  { href: "/reports", label: "Reports", icon: FileDown },
  { href: "/profile", label: "Profile", icon: UserRound },
];

/**
 * Provisioning logins is a firm-level decision, not something a client screen
 * or a CA's own client list should offer, CAs work the clients they are
 * given, they do not decide who else gets access. Appended only for admin.
 */
const ADMIN_NAV: NavItem[] = [
  { href: "/users", label: "Users", icon: UserCog },
  { href: "/audit", label: "Audit log", icon: ScrollText },
];

/** The working screens for one open client. */
const CLIENT_NAV: NavItem[] = [
  { href: "/master-data", label: "Master data", icon: Table2, section: "Data", scoped: true },
  { href: "/upload", label: "Upload", icon: Upload, section: "Data", scoped: true },
  { href: "/mapping", label: "Mapping", icon: Waypoints, section: "Data", scoped: true },
  { href: "/inputs", label: "Adjustments", icon: SlidersHorizontal, section: "Data", scoped: true },
  { href: "/budget", label: "Budget", icon: Wallet, section: "Data", scoped: true },
  { href: "/template", label: "MIS template", icon: Layers, section: "Data", scoped: true },
  { href: "/branches", label: "Branches", icon: GitBranch, section: "Data", scoped: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Reports", scoped: true },
  { href: "/gp-dashboard", label: "GP dashboard", icon: Monitor, section: "Reports", scoped: true },
  { href: "/pnl", label: "P&L detail", icon: FileText, section: "Reports", scoped: true },
  { href: "/budget-vs-actual", label: "Budget vs actual", icon: Target, section: "Reports", scoped: true },
  {
    href: "/segment",
    label: "Segment P&L",
    icon: ChartPie,
    section: "Reports",
    scoped: true,
    navId: "segment",
  },
  { href: "/book-to-bank", label: "Book to bank", icon: Landmark, section: "Reports", scoped: true },
  { href: "/cash-conversion", label: "Cash conversion", icon: RefreshCw, section: "Reports", scoped: true },
  { href: "/debtors", label: "Debtors", icon: Users, section: "Reports", scoped: true },
  { href: "/creditors", label: "Creditors", icon: Truck, section: "Reports", scoped: true },
  { href: "/charts", label: "Charts", icon: ChartColumn, section: "Reports", scoped: true },
  { href: "/reports", label: "Reports", icon: FileDown, section: "Reports", scoped: true },
  { href: "/queries", label: "Notes & queries", icon: MessagesSquare, section: "Reports", scoped: true },
];

/**
 * The nav for a role, with company-scoped links resolved against `slug`.
 *
 * Staff switch list: with no client open they get the firm view, and opening
 * one swaps the sidebar to that client's screens. Without the swap the sidebar
 * would have to show every screen of every client at once, or show client links
 * that have no company to point at.
 *
 * `hasSegments` hides "Segment P&L" for a company with zero segments
 * configured, Segment P&L isn't applicable to every business (it's an
 * optional per-company split, same as the Branches feature), so a company
 * that hasn't set any up shouldn't see a dead-end link to an empty-state
 * page. Defaults to `true` so every other caller (company-role users,
 * firm-level nav with no `slug`) is unaffected, this only ever narrows
 * `CLIENT_NAV`.
 */
export function navFor(role: AppRole, slug: string | null, hasSegments = true): NavItem[] {
  const items =
    role === "company"
      ? COMPANY_NAV
      : slug
        ? hasSegments
          ? CLIENT_NAV
          : CLIENT_NAV.filter((i) => i.href !== "/segment")
        : role === "admin"
          ? // Users sits with the other firm-wide screens, right after the
            // client-facing ones, a CA never sees it at all.
            [...FIRM_NAV.slice(0, 3), ...ADMIN_NAV, ...FIRM_NAV.slice(3)]
          : FIRM_NAV;
  return items.map((i) =>
    i.scoped && slug ? { ...i, href: companyPath(slug, i.href) } : i,
  );
}
