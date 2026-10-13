"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getScopedCompany } from "@/lib/data/company-context";
import { actionFailed, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { plural } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BranchActionState {
  ok: boolean;
  message: string;
}

const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();
const opt = (fd: FormData, key: string): string | null => str(fd, key) || null;

/** "World Trade Jaipur - Indore" -> "world-trade-jaipur-indore". Mirrors the
 *  same slugify used at ingest time (persist.ts's seedBranches) so a branch
 *  created here and one auto-seeded on upload land on the same key shape. */
function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "branch"
  );
}

// --------------------------------------------------------------- branch_groups

export async function saveBranchGroup(formData: FormData, slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const id = str(formData, "id");
  const key = str(formData, "key") || slugify(str(formData, "label"));
  const label = str(formData, "label");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;

  if (!label) return { ok: false, message: "Label is required." };

  const supabase = createAdminClient();
  const payload = { company_id: companyId, key, label, sort_order: sortOrder, updated_at: new Date().toISOString() };

  const result = id
    ? await supabase.from("branch_groups").update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from("branch_groups").insert(payload);
  if (result.error) {
    if (result.error.code === "23505") return { ok: false, message: `"${key}" is already used by another group.` };
    return actionFailed("saveBranchGroup", result.error, `Group not saved. ${TRY_AGAIN}`);
  }

  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `group: ${label}`,
    detail: { key },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${label}" saved.` };
}

export async function deleteBranchGroup(id: string, slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("branch_groups")
    .select("label")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!row) return { ok: false, message: "This group no longer exists. Reload the page to see the current list." };

  // No manual cleanup needed — branches.group_id references this row
  // `on delete set null`, so member branches just fall back to no group
  // (roll straight to Consolidated) rather than being orphaned or blocked.
  const { error } = await supabase.from("branch_groups").delete().eq("id", id).eq("company_id", companyId);
  if (error) return actionFailed("deleteBranchGroup", error, `Group not deleted. ${TRY_AGAIN}`);

  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `group: ${row.label}`,
    detail: { deleted: true },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${row.label}" removed.` };
}

export async function moveBranchGroup(
  id: string,
  direction: "up" | "down",
  slug: string,
): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  try {
    ({ companyId } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const supabase = createAdminClient();
  const { data: siblings } = await supabase
    .from("branch_groups")
    .select("id, sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true });
  if (!siblings) return { ok: false, message: `Groups not reordered. ${TRY_AGAIN}` };

  const idx = siblings.findIndex((s) => s.id === id);
  if (idx === -1) return { ok: false, message: "This group no longer exists. Reload the page to see the current list." };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return { ok: true, message: "" };

  const current = siblings[idx];
  const other = siblings[swapIdx];
  const [r1, r2] = await Promise.all([
    supabase.from("branch_groups").update({ sort_order: other.sort_order }).eq("id", current.id),
    supabase.from("branch_groups").update({ sort_order: current.sort_order }).eq("id", other.id),
  ]);
  if (r1.error || r2.error) return actionFailed("moveBranchOrder", r1.error ?? r2.error, `Order not changed. ${TRY_AGAIN}`);

  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: "" };
}

// -------------------------------------------------------------------- branches

export async function saveBranch(formData: FormData, slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const id = str(formData, "id");
  const key = str(formData, "key") || slugify(str(formData, "label"));
  const label = str(formData, "label");
  const groupId = opt(formData, "groupId");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;

  if (!label) return { ok: false, message: "Label is required." };

  const supabase = createAdminClient();
  const payload = {
    company_id: companyId,
    group_id: groupId,
    key,
    label,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("branches").update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from("branches").insert(payload);
  if (result.error) {
    if (result.error.code === "23505") return { ok: false, message: `"${key}" is already used by another branch.` };
    return actionFailed("saveBranch", result.error, `Branch not saved. ${TRY_AGAIN}`);
  }

  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `branch: ${label}`,
    detail: { key, groupId },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${label}" saved.` };
}

/**
 * Soft-delete, not a real DELETE — an archived branch is excluded from the
 * upload-matching roster and the scope selector's Branch options, but its
 * historical `master_tb` rows stay tagged with its id and remain fully
 * queryable. A branch is real financial history, not a disposable config
 * row: this matches how carefully the rest of the app treats a client's
 * numbers (e.g. period deletion has its own confirm dance).
 */
export async function archiveBranch(id: string, slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("branches")
    .select("label")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!row) return { ok: false, message: "This branch no longer exists. Reload the page to see the current list." };

  const { error } = await supabase
    .from("branches")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return actionFailed("archiveBranch", error, `Branch not archived. ${TRY_AGAIN}`);

  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `branch: ${row.label}`,
    detail: { archived: true },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${row.label}" archived. Past months stay in Consolidated totals.` };
}

/**
 * Permanent delete, not a soft-delete — unlike `archiveBranch`, this really
 * removes the row. Offered ALONGSIDE Archive, not instead of it: Archive
 * stays the normal path for a branch that closed but has real financial
 * history behind it; this is for cleaning up a genuine config mistake (a
 * duplicate branch created by a label typo, an experiment) with nothing
 * worth keeping. Safe the same way `deleteBranchGroup` already is —
 * `master_tb.branch_id`/`manual_inputs.branch_id` are `on delete set null`
 * (`0009_branches.sql`, `0011_manual_inputs_branch.sql`), so any period rows
 * that happen to reference this branch fall back to unscoped/Consolidated
 * rather than being deleted themselves or blocking this delete with a FK
 * error.
 */
export async function deleteBranch(id: string, slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("branches")
    .select("label")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!row) return { ok: false, message: "This branch no longer exists. Reload the page to see the current list." };

  const { error } = await supabase.from("branches").delete().eq("id", id).eq("company_id", companyId);
  if (error) return actionFailed("deleteBranch", error, `Branch not deleted. ${TRY_AGAIN}`);

  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `branch: ${row.label}`,
    detail: { deleted: true },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${row.label}" permanently deleted.` };
}

export async function unarchiveBranch(id: string, slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("branches")
    .select("label")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!row) return { ok: false, message: "This branch no longer exists. Reload the page to see the current list." };

  const { error } = await supabase
    .from("branches")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) return actionFailed("unarchiveBranch", error, `Branch not restored. ${TRY_AGAIN}`);

  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `branch: ${row.label}`,
    detail: { archived: false },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${row.label}" restored.` };
}

/** Move within the company's whole branch list — a single flat order, not
 *  scoped per group, since group assignment is independently editable. */
export async function moveBranch(id: string, direction: "up" | "down", slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  try {
    ({ companyId } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const supabase = createAdminClient();
  const { data: siblings } = await supabase
    .from("branches")
    .select("id, sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true });
  if (!siblings) return { ok: false, message: `Branches not reordered. ${TRY_AGAIN}` };

  const idx = siblings.findIndex((s) => s.id === id);
  if (idx === -1) return { ok: false, message: "This branch no longer exists. Reload the page to see the current list." };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return { ok: true, message: "" };

  const current = siblings[idx];
  const other = siblings[swapIdx];
  const [r1, r2] = await Promise.all([
    supabase.from("branches").update({ sort_order: other.sort_order }).eq("id", current.id),
    supabase.from("branches").update({ sort_order: current.sort_order }).eq("id", other.id),
  ]);
  if (r1.error || r2.error) return actionFailed("moveBranchOrder", r1.error ?? r2.error, `Order not changed. ${TRY_AGAIN}`);

  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: "" };
}

/**
 * Copy an existing company's branches + groups into this one — same
 * refuse-if-non-empty guard as `cloneTemplateFrom`, and the same "strip id,
 * remap group_id through an old->new table" mechanism (groups first, since
 * branches reference them).
 */
export async function cloneBranchesFrom(sourceSlug: string, slug: string): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const source = await getScopedCompany(sourceSlug);
  if (!source) return { ok: false, message: "Source company not found or not accessible." };
  if (source.id === companyId) return { ok: false, message: "Choose a different company to clone from." };

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (count && count > 0) {
    return { ok: false, message: "This company already has branches — clone only works on an empty roster." };
  }

  const [{ data: groups, error: groupsErr }, { data: branches, error: branchesErr }] = await Promise.all([
    supabase.from("branch_groups").select("*").eq("company_id", source.id),
    supabase.from("branches").select("*").eq("company_id", source.id),
  ]);
  if (groupsErr || branchesErr) {
    return actionFailed("cloneBranchesFrom", groupsErr ?? branchesErr, `Branches not copied. ${TRY_AGAIN}`);
  }
  if (!branches || branches.length === 0) return { ok: false, message: `${source.name} has no branches to clone.` };

  const groupIdMap = new Map<string, string>(); // old id -> new id
  if (groups && groups.length > 0) {
    const groupPayload = groups.map((g) => ({
      company_id: companyId,
      key: g.key,
      label: g.label,
      sort_order: g.sort_order,
    }));
    const { data: inserted, error } = await supabase.from("branch_groups").insert(groupPayload).select("id, key");
    if (error) return actionFailed("cloneBranchesFrom", error, `Branches not copied. ${TRY_AGAIN}`);
    for (const g of groups) {
      const match = inserted?.find((i) => i.key === g.key);
      if (match) groupIdMap.set(g.id, match.id);
    }
  }

  const branchPayload = branches.map((b) => ({
    company_id: companyId,
    group_id: b.group_id ? (groupIdMap.get(b.group_id) ?? null) : null,
    key: b.key,
    label: b.label,
    sort_order: b.sort_order,
    // Archived state is a config decision about THIS company's roster, not
    // something worth carrying over from the source — every cloned branch
    // starts active.
  }));
  const insBranches = await supabase.from("branches").insert(branchPayload);
  if (insBranches.error) {
    return actionFailed("cloneBranchesFrom", insBranches.error, `Branches not copied. ${TRY_AGAIN}`);
  }

  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `cloned from ${source.name}`,
    detail: { sourceSlug, groups: groupIdMap.size, branches: branchPayload.length },
  });
  revalidatePath("/c/[slug]", "layout");
  return {
    ok: true,
    message: `Copied ${plural(branchPayload.length, "1 branch", "{n} branches")} and ${plural(groupIdMap.size, "1 group", "{n} groups")} from ${source.name}.`,
  };
}

// ------------------------------------------------------------ report_scope_config

const REPORT_KEYS = ["pnl", "book_to_bank", "ccc", "segment"] as const;
const REPORT_LABEL: Record<(typeof REPORT_KEYS)[number], string> = {
  pnl: "P&L",
  book_to_bank: "Book to Bank",
  ccc: "Cash Conversion",
  segment: "Segment P&L",
};

/** Upsert one report's scope depth — always exactly 4 rows possible per
 *  company (one per REPORT_KEYS), so this is a plain upsert on the table's
 *  own `unique(company_id, report)`, no id/identity juggling needed. */
export async function saveReportScopeDepth(
  report: string,
  scopeDepth: string,
  slug: string,
): Promise<BranchActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  if (!REPORT_KEYS.includes(report as (typeof REPORT_KEYS)[number])) {
    return { ok: false, message: "Unknown report." };
  }
  if (!["consolidated", "group", "branch"].includes(scopeDepth)) {
    return { ok: false, message: "Unknown scope depth." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("report_scope_config")
    .upsert(
      { company_id: companyId, report, scope_depth: scopeDepth, updated_at: new Date().toISOString() },
      { onConflict: "company_id,report" },
    );
  if (error) return actionFailed("saveReportScopeDepth", error, `Setting not saved. ${TRY_AGAIN}`);

  const label = REPORT_LABEL[report as (typeof REPORT_KEYS)[number]];
  await logAudit({
    action: "edit_branches",
    ...actorOf(actor),
    companyId,
    target: `scope: ${label}`,
    detail: { report, scopeDepth },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `${label} set to ${scopeDepth}.` };
}
