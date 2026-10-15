import type { AuditEvent } from "@/lib/data/audit";
import { fmtAmount, plural } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";

/** Role codes in event details (`ca`, `admin`) shown as their labels. */
export function roleName(v: unknown): string {
  return typeof v === "string" ? (ROLE_LABEL[v as keyof typeof ROLE_LABEL] ?? v) : String(v);
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One line of human-readable extra context, built from the event's own shape
 *  rather than a raw JSON dump: this is a trail people read, not a debugger. */
export function summarize(e: AuditEvent): string | null {
  const d = e.detail;
  if (!d) return null;
  switch (e.action) {
    case "master_tb_edit":
      return `${d.field}: ${fmtAmount(Number(d.from))} \u2192 ${fmtAmount(Number(d.to))}`;
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
      return `\u2192 ${d.grouping}`;
    case "user_update":
      return d.roleFrom && d.roleFrom !== d.roleTo ? `role: ${roleName(d.roleFrom)} \u2192 ${roleName(d.roleTo)}` : null;
    case "user_create":
    case "user_remove":
      return typeof d.role === "string" ? `role: ${roleName(d.role)}` : null;
    case "login_success":
      return d.unprovisioned ? "no profile row: treated as no access" : null;
    default:
      return null;
  }
}
