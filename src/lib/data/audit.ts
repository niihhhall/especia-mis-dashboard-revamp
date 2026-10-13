import "server-only";

import type { AuditAction } from "@/lib/audit/log";
import { isDemoMode } from "@/lib/demo/mode";
import { listDemoAuditEvents } from "@/lib/demo/repository";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditEvent {
  id: string;
  at: string;
  action: AuditAction | "master_tb_edit";
  actorEmail: string | null;
  actorRole: string | null;
  companyName: string | null;
  periodLabel: string | null;
  target: string | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
}

const PAGE_SIZE = 100;

/**
 * The admin Audit Log: every `audit_log` row plus every `master_tb_edits` row,
 * merged into one feed newest-first.
 *
 * Two source tables rather than one, deliberately not reconciled into a single
 * write path. `master_tb_edits` already carries the old/new value pair that
 * makes a cell edit auditable and is read directly by the Master Data page's
 * own "Edit history" panel; mirroring every edit into `audit_log` as well
 * would mean two rows to keep in sync for the same fact. Merging at READ time
 * costs one extra query and avoids that.
 *
 * Admin-only by the caller's contract, not enforced here — `requireRole` in
 * the page is what actually gates this before it is ever called.
 */
export async function listAuditEvents(opts: {
  before?: string;
  action?: AuditAction | "master_tb_edit";
  companyId?: string;
} = {}): Promise<{ events: AuditEvent[]; hasMore: boolean }> {
  if (isDemoMode()) return listDemoAuditEvents(opts);
  const admin = createAdminClient();

  const events: AuditEvent[] = [];

  if (!opts.action || opts.action !== "master_tb_edit") {
    let q = admin
      .from("audit_log")
      .select("id, at, action, actor_email, actor_role, target, detail, ip, companies(name), periods(label)")
      .order("at", { ascending: false })
      .limit(PAGE_SIZE + 1);
    if (opts.before) q = q.lt("at", opts.before);
    if (opts.action) q = q.eq("action", opts.action);
    if (opts.companyId) q = q.eq("company_id", opts.companyId);

    const { data, error } = await q;
    if (error) throw new Error(`listAuditEvents(audit_log): ${error.message}`);

    for (const r of data ?? []) {
      const company = r.companies as { name: string } | null;
      const period = r.periods as { label: string } | null;
      events.push({
        id: `a${r.id}`,
        at: r.at,
        action: r.action as AuditAction,
        actorEmail: r.actor_email,
        actorRole: r.actor_role,
        companyName: company?.name ?? null,
        periodLabel: period?.label ?? null,
        target: r.target,
        detail: r.detail as Record<string, unknown> | null,
        ip: r.ip,
      });
    }
  }

  if (!opts.action || opts.action === "master_tb_edit") {
    let q = admin
      .from("master_tb_edits")
      .select(
        "id, edited_at, particulars, field, old_value, new_value, companies(name), periods(label), profiles(email, role)",
      )
      .order("edited_at", { ascending: false })
      .limit(PAGE_SIZE + 1);
    if (opts.before) q = q.lt("edited_at", opts.before);
    if (opts.companyId) q = q.eq("company_id", opts.companyId);

    const { data, error } = await q;
    if (error) throw new Error(`listAuditEvents(master_tb_edits): ${error.message}`);

    for (const r of data ?? []) {
      const company = r.companies as { name: string } | null;
      const period = r.periods as { label: string } | null;
      const editor = r.profiles as { email: string | null; role: string | null } | null;
      events.push({
        id: `m${r.id}`,
        at: r.edited_at,
        action: "master_tb_edit",
        actorEmail: editor?.email ?? null,
        actorRole: editor?.role ?? null,
        companyName: company?.name ?? null,
        periodLabel: period?.label ?? null,
        target: r.particulars,
        detail: { field: r.field, from: Number(r.old_value), to: Number(r.new_value) },
        ip: null,
      });
    }
  }

  events.sort((a, b) => b.at.localeCompare(a.at));
  const page = events.slice(0, PAGE_SIZE);
  return { events: page, hasMore: events.length > PAGE_SIZE };
}
