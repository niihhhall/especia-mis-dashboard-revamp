import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import type { AuditAction } from "@/lib/audit/log";
import { requireRole } from "@/lib/auth/guard";
import { listAuditEvents, type AuditEvent } from "@/lib/data/audit";
import { listCompanies } from "@/lib/data/company-context";
import { fmtAmount, plural } from "@/lib/format";
import { AUDIT_ACTION_LABEL, ROLE_LABEL } from "@/lib/labels";
import { fieldText, focusRing } from "@/lib/ui-classes";

import { LoadMore } from "./load-more";

export const metadata = { title: "Audit Log" };

const ACTION_TONE: Record<string, string> = {
  login_success: "bg-success/12 text-success-text",
  login_failed: "bg-danger/10 text-danger-text",
  logout: "bg-muted text-muted-foreground",
  upload_tb: "bg-info/12 text-info-text",
  upload_ageing: "bg-info/12 text-info-text",
  delete_period: "bg-danger/10 text-danger-text",
  save_adjustments: "bg-warning/15 text-warning-text",
  edit_mapping: "bg-warning/15 text-warning-text",
  edit_template: "bg-muted text-foreground",
  master_tb_edit: "bg-warning/15 text-warning-text",
  company_create: "bg-muted text-foreground",
  user_create: "bg-muted text-foreground",
  user_update: "bg-muted text-foreground",
  user_remove: "bg-danger/10 text-danger-text",
  password_reset: "bg-muted text-foreground",
  upload_gp_dashboard: "bg-info/12 text-info-text",
  bulk_edit_mapping: "bg-warning/15 text-warning-text",
  bulk_edit_budget: "bg-warning/15 text-warning-text",
  edit_branches: "bg-muted text-foreground",
  company_update: "bg-muted text-foreground",
  company_archive: "bg-warning/15 text-warning-text",
  company_unarchive: "bg-muted text-foreground",
  company_delete: "bg-danger/10 text-danger-text",
  company_logo_update: "bg-muted text-foreground",
};

/** Role codes in event details (`ca`, `admin`) shown as their labels. */
function roleName(v: unknown): string {
  return typeof v === "string" ? (ROLE_LABEL[v as keyof typeof ROLE_LABEL] ?? v) : String(v);
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One line of human-readable extra context, built from the event's own shape
 *  rather than a raw JSON dump — this is a trail people read, not a debugger. */
function summarize(e: AuditEvent): string | null {
  const d = e.detail;
  if (!d) return null;
  switch (e.action) {
    case "master_tb_edit":
      return `${d.field}: ${fmtAmount(Number(d.from))} → ${fmtAmount(Number(d.to))}`;
    case "upload_tb":
      return [
        plural(Number(d.rows), "{n} ledger", "{n} ledgers"),
        Number(d.unmapped) > 0 ? `${d.unmapped} unmapped` : null,
        Number(d.replacedEdits) > 0
          ? plural(Number(d.replacedEdits), "replaced {n} manual edit", "replaced {n} manual edits")
          : null,
      ]
        .filter(Boolean)
        .join(", ");
    case "upload_ageing":
      return plural(Number(d.rows), "{n} row", "{n} rows");
    case "save_adjustments":
      return Array.isArray(d.fields) ? plural(d.fields.length, "{n} field set", "{n} fields set") : null;
    case "edit_mapping":
      return `→ ${d.grouping}`;
    case "user_update":
      return d.roleFrom && d.roleFrom !== d.roleTo ? `role: ${roleName(d.roleFrom)} → ${roleName(d.roleTo)}` : null;
    case "user_create":
    case "user_remove":
      return typeof d.role === "string" ? `role: ${roleName(d.role)}` : null;
    case "login_success":
      return d.unprovisioned ? "no profile row — treated as no access" : null;
    default:
      return null;
  }
}

function Row({ e }: { e: AuditEvent }) {
  const note = summarize(e);
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-caption font-semibold ${ACTION_TONE[e.action] ?? "bg-muted text-muted-foreground"}`}
          >
            {AUDIT_ACTION_LABEL[e.action as keyof typeof AUDIT_ACTION_LABEL] ?? e.action}
          </span>
          {e.target && <span className="line-clamp-2 min-w-0 break-words text-sm font-medium">{e.target}</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {e.actorEmail ?? "—"}
          {e.actorRole && ` · ${roleName(e.actorRole)}`}
          {e.companyName && ` · ${e.companyName}`}
          {e.periodLabel && ` · ${e.periodLabel}`}
        </p>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
      <time dateTime={e.at} className="shrink-0 text-xs text-muted-foreground">
        {when(e.at)}
      </time>
    </li>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; company?: string; before?: string }>;
}) {
  try {
    await requireRole(["admin"]);
  } catch {
    redirect("/");
  }

  const { action, company, before } = await searchParams;
  const companies = await listCompanies();
  const companyId = company ? companies.find((c) => c.slug === company)?.id : undefined;

  // The <select> only ever offers a key from AUDIT_ACTION_LABEL, so a value outside
  // that set can only arrive from a hand-edited URL — harmless here, since an
  // unrecognised action just matches nothing in either underlying query.
  const isValidAction = (v?: string): v is AuditAction | "master_tb_edit" =>
    !!v && v in AUDIT_ACTION_LABEL;

  const { events, hasMore } = await listAuditEvents({
    action: isValidAction(action) ? action : undefined,
    companyId,
    before,
  });

  const actionOptions = Object.keys(AUDIT_ACTION_LABEL) as (keyof typeof AUDIT_ACTION_LABEL)[];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle={<>Every sign-in and every change to a company&rsquo;s MIS, across the firm.</>}
        filters={
          <form className="flex flex-wrap items-center gap-2" method="get">
            <label htmlFor="audit-action" className="sr-only">
              Action
            </label>
            <select
              id="audit-action"
              name="action"
              defaultValue={action ?? ""}
              className={`h-9 rounded-lg border border-border bg-card px-3 ${fieldText} ${focusRing}`}
            >
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABEL[a]}
                </option>
              ))}
            </select>
            <label htmlFor="audit-company" className="sr-only">
              Company
            </label>
            <select
              id="audit-company"
              name="company"
              defaultValue={company ?? ""}
              className={`h-9 rounded-lg border border-border bg-card px-3 ${fieldText} ${focusRing}`}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
            >
              Filter
            </button>
          </form>
        }
      />

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nothing recorded yet for this filter.
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {events.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </ul>
          {hasMore && (
            <LoadMore before={events[events.length - 1].at} action={action} company={company} />
          )}
        </>
      )}
    </section>
  );
}
