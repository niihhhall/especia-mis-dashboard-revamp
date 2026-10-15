import "server-only";

import { cache } from "react";

import { getSessionProfile } from "@/lib/auth/session";
import { canAccessCompany, visibleCompanyIds } from "@/lib/auth/guard";
import { getDemoCompanyBySlug, demoCompanySummary, DEMO_COMPANY_ID, DEMO_COMPANY_SLUG } from "@/lib/demo/repository";
import { isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CompanySummary {
  id: string;
  slug: string;
  name: string;
  group_name: string | null;
  archived_at: string | null;
  logo_url: string | null;
}

/**
 * Every company the caller may work on, alphabetically.
 *
 * Read with the ADMIN client and then filtered by `visibleCompanyIds()` rather
 * than leaning on RLS. The two agree, but this list drives a *switcher*: if a
 * policy ever widened by accident, an RLS-only read would quietly start
 * offering other firms' clients in the CA's dropdown. Filtering explicitly
 * keeps the visible set defined in one auditable place.
 *
 * Archived companies (soft-deleted, `companies.archived_at`) are excluded by
 * default, the switcher, the Companies grid's active list, the review
 * queue, etc. should all read as if the company isn't there, without its
 * data actually being touched. Pass `includeArchived: true` only for the
 * admin-only "Archived companies" section that can unarchive one.
 */
export const listCompanies = cache(async (includeArchived = false): Promise<CompanySummary[]> => {
  if (isDemoMode()) return includeArchived ? [] : [{ ...demoCompanySummary }];
  const profile = await getSessionProfile();
  if (!profile) return [];

  const allowed = await visibleCompanyIds(profile);
  if (allowed !== "all" && allowed.length === 0) return [];

  const admin = createAdminClient();
  let q = admin.from("companies").select("id, slug, name, group_name, archived_at, logo_url").order("name");
  if (allowed !== "all") q = q.in("id", allowed);
  if (!includeArchived) q = q.is("archived_at", null);

  const { data, error } = await q;
  if (error) throw new Error(`listCompanies: ${error.message}`);
  return data ?? [];
});

/**
 * The company named by a `/c/<slug>` path segment.
 *
 * Takes `slug` explicitly rather than reading it from a request header.
 * `proxy.ts` used to inject that header on every request before any page
 * rendered, it's gone (Next 16 locked Proxy to the Node.js runtime, which
 * this app's Cloudflare host does not run), so `slug` now comes from each
 * page/layout's own `params`, the officially-supported way to reach a
 * non-root dynamic segment from Next's own docs. `cache()` still dedupes
 * repeat calls with the same slug within one request, so calling this again
 * at the page level after the layout already did costs nothing extra.
 *
 * Returns null when there is no slug (the Companies grid, Profile), so
 * callers can tell "no company chosen" from "company denied", a denial
 * throws, because silently falling back to a company the user *can* see would
 * render one client's figures at another client's address.
 */
export const getScopedCompany = cache(async (slug: string | null): Promise<CompanySummary | null> => {
  if (isDemoMode()) return getDemoCompanyBySlug(slug);
  if (!slug) return null;

  const profile = await getSessionProfile();
  if (!profile) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("id, slug, name, group_name, archived_at, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getScopedCompany: ${error.message}`);
  if (!data) return null;

  if (!(await canAccessCompany(profile, data.id))) return null;
  return data;
});

/**
 * The company id the data layer should read for, or null when there is none.
 *
 * A company-role user is pinned to their own company whatever the URL says, so
 * a mistyped slug can never widen what they see, it just fails to resolve.
 */
export const activeCompanyId = cache(async (slug: string | null): Promise<string | null> => {
  if (isDemoMode()) return slug === DEMO_COMPANY_SLUG ? DEMO_COMPANY_ID : null;
  const scoped = await getScopedCompany(slug);
  if (scoped) return scoped.id;

  const profile = await getSessionProfile();
  if (profile?.role === "company") return profile.companyId;
  return null;
});

/** Where to send someone who arrives without a company in the URL. */
export const defaultCompanySlug = cache(async (): Promise<string | null> => {
  if (isDemoMode()) return DEMO_COMPANY_SLUG;
  const profile = await getSessionProfile();
  if (!profile) return null;

  if (profile.role === "company") {
    if (!profile.companyId) return null;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("companies")
      .select("slug")
      .eq("id", profile.companyId)
      .maybeSingle();
    if (error) throw new Error(`defaultCompanySlug: ${error.message}`);
    return data?.slug ?? null;
  }

  // Staff have no single home company, only pick one for them when there is
  // exactly one to pick. With several, the Companies grid is the right landing.
  const companies = await listCompanies();
  return companies.length === 1 ? companies[0].slug : null;
});
