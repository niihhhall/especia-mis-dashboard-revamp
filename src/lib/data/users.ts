import "server-only";

import type { AppRole } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";
import { getDemoUsers } from "@/lib/demo/repository";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: AppRole;
  createdAt: string;
  /** Set for a company-role user only. */
  company: { id: string; slug: string; name: string } | null;
  /** Set for a ca-role user only — the clients on their desk. */
  assignedCompanies: { id: string; slug: string; name: string }[];
}

/**
 * Every provisioned account, for the admin Users screen.
 *
 * Reads with the ADMIN client rather than the request-scoped one: RLS already
 * lets an admin read every `profiles` row (`profiles_read`), but the assignment
 * join below needs `ca_companies` across every CA at once, which is exactly the
 * kind of cross-account read this screen exists to do. There is no broader
 * write here — creating, editing and removing accounts are separate, narrowly
 * scoped actions, each re-checking `requireRole(["admin"])` on its own.
 */
export async function listUsers(): Promise<UserRow[]> {
  if (isDemoMode()) return getDemoUsers();
  const admin = createAdminClient();

  const [{ data: profiles, error: pErr }, { data: links, error: lErr }] = await Promise.all([
    admin
      .from("profiles")
      // `!profiles_company_id_fkey` disambiguates the embed: PostgREST also
      // sees an implicit many-to-many path from profiles to companies through
      // ca_companies (ca_id -> profiles, company_id -> companies) and refuses
      // to guess between the two without this hint.
      .select(
        "id, name, email, role, company_id, created_at, companies!profiles_company_id_fkey(id, slug, name)",
      )
      .order("role")
      .order("name"),
    admin.from("ca_companies").select("ca_id, companies(id, slug, name)"),
  ]);
  if (pErr) throw new Error(`listUsers(profiles): ${pErr.message}`);
  if (lErr) throw new Error(`listUsers(assignments): ${lErr.message}`);

  const assignedBy = new Map<string, UserRow["assignedCompanies"]>();
  for (const l of links ?? []) {
    const c = l.companies as { id: string; slug: string; name: string } | null;
    if (!c) continue;
    assignedBy.set(l.ca_id, [...(assignedBy.get(l.ca_id) ?? []), c]);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as AppRole,
    createdAt: p.created_at,
    company: (p.companies as UserRow["company"]) ?? null,
    assignedCompanies: assignedBy.get(p.id) ?? [],
  }));
}
