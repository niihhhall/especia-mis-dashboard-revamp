import "server-only";

import { DEMO_COMPANY_ID } from "@/lib/demo/repository";
import { isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";

import { getSessionProfile, type AppRole, type SessionProfile } from "./session";

/**
 * Authorisation errors. Distinguished from ordinary failures so callers can
 * turn them into a 403 / redirect rather than a 500.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Gate a server action or route handler on the caller's role, and, when a
 * company is named, on their access to that specific company.
 *
 * This is the ONLY thing standing between a visitor and the ingestion writes.
 * Every write path calls `createAdminClient()`, which uses the service-role key
 * and bypasses RLS entirely, so no database policy can protect them. Server
 * actions are POST endpoints addressable on their own, being rendered behind a
 * page the user cannot see is not protection.
 */
export async function requireRole(
  roles: AppRole[],
  companyId?: string,
): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) throw new AuthError("Not signed in.", 401);
  if (!roles.includes(profile.role)) {
    throw new AuthError(`Requires ${roles.join(" or ")} access.`, 403);
  }
  if (companyId && !(await canAccessCompany(profile, companyId))) {
    throw new AuthError("No access to this company.", 403);
  }
  return profile;
}

/** Signed in and provisioned, whatever the role. */
export async function requireUser(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) throw new AuthError("Not signed in.", 401);
  return profile;
}

/**
 * Whether a profile may reach a company: admin anywhere, company users only
 * their own, CAs only where an assignment row exists.
 *
 * Mirrors the SQL `visible_company_ids()` helper. Kept in step with it
 * deliberately, the SQL guards reads, this guards writes.
 */
export async function canAccessCompany(
  profile: SessionProfile,
  companyId: string,
): Promise<boolean> {
  if (isDemoMode()) return companyId === DEMO_COMPANY_ID;
  if (profile.role === "admin") return true;
  if (profile.role === "company") return profile.companyId === companyId;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ca_companies")
    .select("company_id")
    .eq("ca_id", profile.userId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(`canAccessCompany: ${error.message}`);
  return Boolean(data);
}

/** Every company id the caller may reach, for switchers and admin listings. */
export async function visibleCompanyIds(profile: SessionProfile): Promise<string[] | "all"> {
  if (isDemoMode()) return [DEMO_COMPANY_ID];
  if (profile.role === "admin") return "all";
  if (profile.role === "company") return profile.companyId ? [profile.companyId] : [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ca_companies")
    .select("company_id")
    .eq("ca_id", profile.userId);
  if (error) throw new Error(`visibleCompanyIds: ${error.message}`);
  return (data ?? []).map((r) => r.company_id);
}

/**
 * The company a write applies to, with the caller's access to it checked.
 *
 * Every ingestion path runs as service-role and bypasses RLS, so this is the
 * only thing standing between a signed-in CA and another firm's data.
 *
 * `slug` must be passed explicitly by the caller now, it used to be read
 * from a request header `proxy.ts` injected on every request, but proxy is
 * gone (Next 16 locked it to the Node.js runtime, which this app's Cloudflare
 * host does not run). A Server Action has no `params` of its own, so the
 * component that renders the form carries the slug from ITS `params` into the
 * action, typically as a hidden field the action reads out of `formData`.
 *
 * Throws rather than falling back to a default company. The previous constant
 * meant a CA working on one client would have silently written the trial
 * balance of another into Tirupati; refusing is the only safe answer when the
 * target is ambiguous.
 */
export async function requireCompany(
  roles: AppRole[],
  slug: string | null,
): Promise<{ profile: SessionProfile; companyId: string }> {
  // Imported here rather than at module scope: `data/company-context` imports
  // this file for `canAccessCompany`, and a top-level import would close the
  // cycle.
  const { activeCompanyId } = await import("@/lib/data/company-context");

  const profile = await requireRole(roles);
  const companyId = await activeCompanyId(slug);

  // One message for "no such company" and "not your company" alike, matching
  // the page guard: the difference between them would tell a CA which clients
  // the firm has on its books.
  if (!companyId) throw new AuthError("That company is not available for your account.", 403);
  if (!(await canAccessCompany(profile, companyId))) {
    throw new AuthError("That company is not available for your account.", 403);
  }
  return { profile, companyId };
}
