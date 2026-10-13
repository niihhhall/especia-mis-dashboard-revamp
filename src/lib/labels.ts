// Display labels for internal codes (roles, audit actions, statuses), so the
// UI never shows a raw identifier like `ca` or `upload_gp_dashboard`.

import type { AuditAction } from "@/lib/audit/log";
import type { AppRole } from "@/lib/auth/session";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  ca: "Chartered accountant",
  company: "Client",
};

/** Every action `logAudit` records, plus `master_tb_edit` from the Master Data edit history. */
export const AUDIT_ACTION_LABEL: Record<AuditAction | "master_tb_edit", string> = {
  login_success: "Signed in",
  login_failed: "Sign-in failed",
  logout: "Signed out",
  upload_tb: "Uploaded trial balance",
  upload_ageing: "Uploaded ageing",
  upload_gp_dashboard: "Uploaded GP Dashboard",
  delete_period: "Deleted month",
  save_adjustments: "Saved adjustments",
  edit_mapping: "Edited mapping",
  bulk_edit_mapping: "Uploaded mapping",
  bulk_edit_budget: "Uploaded budget",
  edit_template: "Edited MIS Template",
  edit_branches: "Edited branches",
  master_tb_edit: "Edited Master Data",
  company_create: "Added company",
  company_update: "Updated company",
  company_archive: "Archived company",
  company_unarchive: "Restored company",
  company_delete: "Deleted company",
  company_logo_update: "Changed company logo",
  user_create: "Added user",
  user_update: "Updated user",
  user_remove: "Removed user",
  password_reset: "Reset password",
};

export const QUERY_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

export const PERIOD_STATUS_LABEL: Record<string, string> = {
  published: "Published",
  draft: "Draft",
};
