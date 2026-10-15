import "server-only";

import { headers } from "next/headers";

import type { AppRole, SessionProfile } from "@/lib/auth/session";
import type { Json } from "@/lib/database.types";
import { isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "upload_tb"
  | "upload_ageing"
  | "upload_gp_dashboard"
  | "delete_period"
  | "save_adjustments"
  | "edit_mapping"
  | "bulk_edit_mapping"
  | "bulk_edit_budget"
  | "edit_template"
  | "edit_branches"
  | "company_create"
  | "company_update"
  | "company_archive"
  | "company_unarchive"
  | "company_delete"
  | "company_logo_update"
  | "user_create"
  | "user_update"
  | "user_remove"
  | "password_reset";

export interface AuditEntry {
  action: AuditAction;
  actorId?: string;
  /** Always set this, even when `actorId` is not, a failed login has an
   *  attempted email but no authenticated identity to attach one to. */
  actorEmail?: string;
  actorRole?: AppRole;
  companyId?: string;
  periodId?: string;
  target?: string;
  detail?: Record<string, unknown>;
}

/** Spreads a `SessionProfile` into the three actor fields `logAudit` wants -
 *  the common case at every call site that already has one from a guard. */
export function actorOf(profile: SessionProfile): Pick<AuditEntry, "actorId" | "actorEmail" | "actorRole"> {
  return { actorId: profile.userId, actorEmail: profile.email ?? undefined, actorRole: profile.role };
}

/**
 * Record one line in the audit trail.
 *
 * Deliberately swallows its own failure. This is called from inside actions
 * that have already done the real work, an upload has already landed, a
 * password has already changed, and a logging hiccup (a transient DB blip,
 * a schema mismatch after a bad deploy) must never turn a successful action
 * into a failure response the user sees. It logs to the server console
 * instead, which is where an operator would look for exactly this kind of
 * silent-infrastructure problem.
 *
 * IP and user agent come from `headers()`, which works inside a Server Action
 * because it still executes within the original request's context.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  if (isDemoMode()) return;
  try {
    const h = await headers();
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      action: entry.action,
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      actor_role: entry.actorRole ?? null,
      company_id: entry.companyId ?? null,
      period_id: entry.periodId ?? null,
      target: entry.target ?? null,
      // `detail` is caller-built from plain string/number/boolean values (see
      // every call site), which is always valid JSON, the generated `Json`
      // type just cannot express "any object shaped like this" structurally.
      detail: (entry.detail ?? null) as Json,
      // Kong/most proxies append the client IP as the first hop in
      // x-forwarded-for; a direct connection (local dev) has no such header.
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: h.get("user-agent"),
    });
    if (error) console.error(`logAudit(${entry.action}): ${error.message}`);
  } catch (e) {
    console.error(`logAudit(${entry.action}) threw:`, e);
  }
}
