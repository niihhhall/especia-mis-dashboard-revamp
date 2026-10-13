import type { AppRole } from "@/lib/auth/session";

/** The signed-in identity the shell shows: sidebar footer and nav role. */
export interface ShellProfile {
  name: string | null;
  email: string | null;
  role: AppRole;
}

/** A company as the shell names it: breadcrumb and the open company block. */
export interface ShellCompanyLink {
  slug: string;
  name: string;
}

/** What `c/[slug]/layout.tsx` hands to the shell and the company pages. */
export interface CompanyScopeValue {
  slug: string;
  name: string;
  periods: { id: string; label: string }[];
  selected: { id: string; label: string } | null;
  /** False hides "Segment P&L" in the sidebar and the report tabs. */
  hasSegments: boolean;
}
