import "server-only";

import { requireUser } from "@/lib/auth/guard";
import { assertWritable, isDemoMode } from "@/lib/demo/mode";
import { getDemoQueries } from "@/lib/demo/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface QueryReply {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_role: string | null;
}

export interface QueryThread {
  id: string;
  body: string;
  status: "open" | "answered" | "closed";
  created_at: string;
  period_label: string | null;
  author_name: string | null;
  author_role: string | null;
  replies: QueryReply[];
}

/**
 * Query threads visible to the caller. Read through the USER client so RLS
 * scopes them, a company sees only its own, a CA only their assigned
 * companies', an admin all of them.
 */
export async function getQueries(): Promise<QueryThread[]> {
  if (isDemoMode()) return getDemoQueries();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("queries")
    .select(
      "id, body, status, created_at, period_id, author_id, periods(label), profiles(name, role), query_replies(id, body, created_at, profiles(name, role))",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getQueries: ${error.message}`);

  type Row = NonNullable<typeof data>[number];
  return (data ?? []).map((q: Row) => ({
    id: q.id,
    body: q.body,
    status: q.status as QueryThread["status"],
    created_at: q.created_at,
    period_label: (q.periods as { label: string } | null)?.label ?? null,
    author_name: (q.profiles as { name: string | null } | null)?.name ?? null,
    author_role: (q.profiles as { role: string | null } | null)?.role ?? null,
    replies: ((q.query_replies ?? []) as Array<{
      id: string;
      body: string;
      created_at: string;
      profiles: { name: string | null; role: string | null } | null;
    }>)
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        id: r.id,
        body: r.body,
        created_at: r.created_at,
        author_name: r.profiles?.name ?? null,
        author_role: r.profiles?.role ?? null,
      })),
  }));
}

/**
 * Raise a query, or reply to one.
 *
 * Writes go through the admin client because `queries` has no INSERT policy -
 * the migration secures reads only, deliberately. Authorisation is therefore
 * this function's job: requireUser() establishes who is asking, and the
 * company_id is taken from their profile rather than from the form, so a
 * caller cannot post into another company's thread.
 */
export async function createQuery(body: string, periodId: string | null): Promise<void> {
  assertWritable("createQuery");
  const profile = await requireUser();
  const admin = createAdminClient();

  // Company users post against their own company. Staff act on the company
  // currently in view, resolved server-side, never taken from the client.
  const companyId = profile.companyId;
  if (!companyId) throw new Error("Only a company account can raise a query today.");

  const { error } = await admin
    .from("queries")
    .insert({ company_id: companyId, period_id: periodId, author_id: profile.userId, body });
  if (error) throw new Error(`createQuery: ${error.message}`);
}

export async function replyToQuery(queryId: string, body: string): Promise<void> {
  assertWritable("replyToQuery");
  const profile = await requireUser();
  const admin = createAdminClient();

  // Confirm the thread is one the caller may see before attaching a reply -
  // the admin client bypasses RLS, so this check replaces it.
  const { data: thread, error: readErr } = await admin
    .from("queries")
    .select("id, company_id")
    .eq("id", queryId)
    .maybeSingle();
  if (readErr) throw new Error(`replyToQuery: ${readErr.message}`);
  if (!thread) throw new Error("Query not found.");

  const { canAccessCompany } = await import("@/lib/auth/guard");
  if (!(await canAccessCompany(profile, thread.company_id))) {
    throw new Error("No access to this query.");
  }

  const { error } = await admin
    .from("query_replies")
    .insert({ query_id: queryId, author_id: profile.userId, body });
  if (error) throw new Error(`replyToQuery: ${error.message}`);

  // A staff answer moves the thread on; a company follow-up leaves it open.
  if (profile.role !== "company") {
    await admin.from("queries").update({ status: "answered" }).eq("id", queryId);
  }
}
