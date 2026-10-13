import "server-only";

import { isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "ca" | "company";

export interface SessionProfile {
  userId: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  /** Set for company-role users only; null for ca/admin. */
  companyId: string | null;
}

/**
 * The signed-in user's profile, or null when nobody is signed in.
 *
 * Uses `getUser()` rather than `getSession()`: getSession reads the cookie and
 * trusts it, while getUser revalidates the JWT with the auth server. On a
 * server that is the difference between a check and a formality.
 *
 * The profile row is fetched with the ADMIN client on purpose. Reading it
 * through the user client would be circular — the RLS policy on `profiles`
 * calls `current_app_role()`, which reads `profiles` — and a user must be able
 * to learn their own role before any policy can be evaluated for them.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (isDemoMode()) {
    return { userId: "demo-user", email: "demo@especia.local", name: "Demo User", role: "admin", companyId: null };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, company_id, name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`getSessionProfile: ${error.message}`);

  // Signed in but unprovisioned. Treated as "no access" rather than a partial
  // session, so it fails closed instead of rendering an empty dashboard.
  if (!data) return null;

  return {
    userId: data.id,
    email: data.email ?? user.email ?? null,
    name: data.name,
    role: data.role as AppRole,
    companyId: data.company_id,
  };
}
