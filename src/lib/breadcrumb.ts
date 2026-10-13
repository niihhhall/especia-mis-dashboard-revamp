import { companyPath, companySlugFromPath } from "./company-scope";
import type { NavItem } from "@/types/nav";
import type { ShellCompanyLink } from "@/types/shell";

export interface Crumb {
  label: string;
  /** Omitted on the last crumb, the current page. */
  href?: string;
}

/** The product name shown as the first crumb when no company is open. */
const PRODUCT_NAME = "Especia MIS";

/**
 * The top bar breadcrumb, built from existing text only (OQ-6): the open
 * company's name (or the product name on firm pages), then the label of the
 * nav item the path is under. A path with no nav match yields crumb 1 only.
 *
 * `company` is the shell's known company. When it does not match the slug in
 * the path (an archived company missing from the directory), the slug stands
 * in for the name, the same fallback the sidebar uses.
 */
export function breadcrumbFor(
  pathname: string,
  items: NavItem[],
  company: ShellCompanyLink | null,
): Crumb[] {
  const slug = companySlugFromPath(pathname);
  const first: Crumb = slug
    ? {
        label: company && company.slug === slug ? company.name : slug,
        href: companyPath(slug, "/dashboard"),
      }
    : { label: PRODUCT_NAME, href: items[0]?.href ?? "/companies" };

  // Same active rule as the sidebar; the longest match wins so a nested
  // route never resolves to a shorter parent item.
  const match = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return match ? [first, { label: match.label }] : [first];
}
