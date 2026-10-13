"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getScopedCompany } from "@/lib/data/company-context";
import { actionFailed, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { plural } from "@/lib/format";
import { UNIVERSAL_NO_TEMPLATE_GROUPINGS } from "@/lib/mis/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TemplateActionState {
  ok: boolean;
  message: string;
}

const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();
const opt = (fd: FormData, key: string): string | null => str(fd, key) || null;

/**
 * One past the highest sort_order already in this company/section, so a new
 * line always lands after every existing one instead of colliding with
 * other new lines on a shared placeholder value (see saveTemplateLine).
 */
async function nextSortOrder(
  supabase: ReturnType<typeof createAdminClient>,
  companyId: string,
  section: string,
): Promise<number> {
  const { data } = await supabase
    .from("mis_template_lines")
    .select("sort_order")
    .eq("company_id", companyId)
    .eq("section", section)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 1;
}

/**
 * Add or edit one P&L / Book-to-Bank template line. `id` present → update
 * that row (identity is the row's own id, not `key` — so renaming a line's
 * key doesn't orphan it); `id` absent → insert a new row. `key` still needs
 * to be unique per company (the DB's own `unique(company_id, key)`
 * constraint is the real guard — this is just a friendlier error message).
 */
export async function saveTemplateLine(formData: FormData, slug: string): Promise<TemplateActionState> {
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
  const section = str(formData, "section");
  const kind = str(formData, "kind");
  const key = str(formData, "key");
  const label = str(formData, "label");
  const grouping = opt(formData, "grouping");
  const manualKey = opt(formData, "manualKey");
  const fallbackGrouping = opt(formData, "fallbackGrouping");
  const negate = formData.get("negate") === "on";
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;

  if (!key || !label) return { ok: false, message: "Key and label are required." };
  if (kind === "grouping" && !grouping) {
    return { ok: false, message: "A grouping-kind line needs a grouping name." };
  }
  if (kind === "manual" && !manualKey) {
    return { ok: false, message: "A manual-kind line needs a manual key." };
  }
  if (kind === "computed" && !grouping) {
    return { ok: false, message: "A computed-kind line needs a grouping name." };
  }
  // The engine already computes these directly (pnl.ts's opening stock,
  // book-to-bank.ts's Sundry Creditors/Debtors/Fixed Assets/Capital A/c/
  // Unsecured Loans/Cash,Bank&OD) — a template line pointing at the same
  // grouping would sum it a second time, silently doubling that figure.
  const fallback = kind === "manual" ? fallbackGrouping : grouping;
  if (fallback && UNIVERSAL_NO_TEMPLATE_GROUPINGS.has(fallback)) {
    return {
      ok: false,
      message: `"${fallback}" is computed automatically by the engine — it needs no template line, and adding one would double-count it.`,
    };
  }

  const supabase = createAdminClient();
  // A new line ignores whatever sortOrder the form sent (the "Add line" row
  // always submits a placeholder) and is placed after every existing line in
  // its section instead — otherwise many added-over-time lines collide on
  // the same placeholder value, and Move up/down (which swaps with the
  // adjacent row in sort_order order) starts jumping rows instead of moving
  // them one step, since "adjacent" among tied rows is no longer stable.
  // Editing an existing line (id present) keeps echoing its current
  // position, which the form already carries.
  const payload = {
    company_id: companyId,
    section,
    sort_order: id ? sortOrder : await nextSortOrder(supabase, companyId, section),
    kind,
    key,
    label,
    grouping,
    manual_key: manualKey,
    fallback_grouping: fallbackGrouping,
    negate,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("mis_template_lines").update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from("mis_template_lines").insert(payload);
  if (result.error) {
    // Postgres unique_violation on (company_id, key).
    if (result.error.code === "23505") return { ok: false, message: `"${key}" is already used by another line.` };
    return actionFailed("saveTemplateLine", result.error, `Line not saved. ${TRY_AGAIN}`);
  }

  await logAudit({
    action: "edit_template",
    ...actorOf(actor),
    companyId,
    target: `${section}: ${label}`,
    detail: { key, kind, grouping, manualKey, fallbackGrouping, negate },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${label}" saved.` };
}

export async function deleteTemplateLine(id: string, slug: string): Promise<TemplateActionState> {
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
    .from("mis_template_lines")
    .select("label, section")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!row) return { ok: false, message: "This line no longer exists. Reload the page to see the current template." };

  const { error } = await supabase.from("mis_template_lines").delete().eq("id", id).eq("company_id", companyId);
  if (error) return actionFailed("deleteTemplateLine", error, `Line not deleted. ${TRY_AGAIN}`);

  await logAudit({
    action: "edit_template",
    ...actorOf(actor),
    companyId,
    target: `${row.section}: ${row.label}`,
    detail: { deleted: true },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${row.label}" removed.` };
}

/** Swap this line's sort_order with the adjacent line in the same section. */
export async function moveTemplateLine(
  id: string,
  direction: "up" | "down",
  slug: string,
): Promise<TemplateActionState> {
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
  const { data: current } = await supabase
    .from("mis_template_lines")
    .select("id, section, sort_order")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!current) return { ok: false, message: "This line no longer exists. Reload the page to see the current template." };

  const { data: siblings } = await supabase
    .from("mis_template_lines")
    .select("id, sort_order")
    .eq("company_id", companyId)
    .eq("section", current.section)
    .order("sort_order", { ascending: true });
  if (!siblings) return { ok: false, message: `Order not changed. ${TRY_AGAIN}` };

  const idx = siblings.findIndex((s) => s.id === current.id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return { ok: true, message: "" }; // already at the edge

  const other = siblings[swapIdx];
  const [r1, r2] = await Promise.all([
    supabase.from("mis_template_lines").update({ sort_order: other.sort_order }).eq("id", current.id),
    supabase.from("mis_template_lines").update({ sort_order: current.sort_order }).eq("id", other.id),
  ]);
  if (r1.error || r2.error) return actionFailed("moveTemplateOrder", r1.error ?? r2.error, `Order not changed. ${TRY_AGAIN}`);

  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: "" };
}

/** Add or edit one segment. Same id-vs-key identity reasoning as template lines. */
export async function saveSegment(formData: FormData, slug: string): Promise<TemplateActionState> {
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
  const key = str(formData, "key");
  const label = str(formData, "label");
  const revenueGrouping = opt(formData, "revenueGrouping");
  const revenueManualKey = opt(formData, "revenueManualKey");
  const revenueFallbackGrouping = opt(formData, "revenueFallbackGrouping");
  const purchaseGroupings = str(formData, "purchaseGroupings")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;

  if (!key || !label) return { ok: false, message: "Key and label are required." };
  if (!revenueGrouping && !revenueManualKey) {
    return { ok: false, message: "A segment needs a revenue grouping or a revenue manual key." };
  }

  const supabase = createAdminClient();
  const payload = {
    company_id: companyId,
    key,
    label,
    sort_order: sortOrder,
    revenue_grouping: revenueGrouping,
    revenue_manual_key: revenueManualKey,
    revenue_fallback_grouping: revenueFallbackGrouping,
    purchase_groupings: purchaseGroupings,
    updated_at: new Date().toISOString(),
  };

  const result = id
    ? await supabase.from("mis_segments").update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from("mis_segments").insert(payload);
  if (result.error) {
    if (result.error.code === "23505") return { ok: false, message: `"${key}" is already used by another segment.` };
    return actionFailed("saveSegment", result.error, `Segment not saved. ${TRY_AGAIN}`);
  }

  await logAudit({
    action: "edit_template",
    ...actorOf(actor),
    companyId,
    target: `segment: ${label}`,
    detail: { key, revenueGrouping, revenueManualKey, purchaseGroupings },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${label}" saved.` };
}

export async function deleteSegment(id: string, slug: string): Promise<TemplateActionState> {
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
    .from("mis_segments")
    .select("label")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!row) return { ok: false, message: "This segment no longer exists. Reload the page to see the current list." };

  const { error } = await supabase.from("mis_segments").delete().eq("id", id).eq("company_id", companyId);
  if (error) return actionFailed("deleteSegment", error, `Segment not deleted. ${TRY_AGAIN}`);

  await logAudit({
    action: "edit_template",
    ...actorOf(actor),
    companyId,
    target: `segment: ${row.label}`,
    detail: { deleted: true },
  });
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `"${row.label}" removed.` };
}

export async function moveSegment(id: string, direction: "up" | "down", slug: string): Promise<TemplateActionState> {
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
    .from("mis_segments")
    .select("id, sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true });
  if (!siblings) return { ok: false, message: `Order not changed. ${TRY_AGAIN}` };

  const idx = siblings.findIndex((s) => s.id === id);
  if (idx === -1) return { ok: false, message: "This segment no longer exists. Reload the page to see the current list." };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return { ok: true, message: "" };

  const current = siblings[idx];
  const other = siblings[swapIdx];
  const [r1, r2] = await Promise.all([
    supabase.from("mis_segments").update({ sort_order: other.sort_order }).eq("id", current.id),
    supabase.from("mis_segments").update({ sort_order: current.sort_order }).eq("id", other.id),
  ]);
  if (r1.error || r2.error) return actionFailed("moveTemplateOrder", r1.error ?? r2.error, `Order not changed. ${TRY_AGAIN}`);

  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: "" };
}

/**
 * Copy an existing company's template + segments into this one — refused if
 * this company already has ANY template rows, so cloning can never silently
 * clobber or duplicate a template someone has already started building.
 */
export async function cloneTemplateFrom(sourceSlug: string, slug: string): Promise<TemplateActionState> {
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
    .from("mis_template_lines")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (count && count > 0) {
    return { ok: false, message: "This company already has template lines — clone only works on an empty template." };
  }

  const [{ data: lines, error: linesErr }, { data: segments, error: segErr }] = await Promise.all([
    supabase.from("mis_template_lines").select("*").eq("company_id", source.id),
    supabase.from("mis_segments").select("*").eq("company_id", source.id),
  ]);
  if (linesErr || segErr) {
    return actionFailed("cloneTemplateFrom", linesErr ?? segErr, `Template not copied. ${TRY_AGAIN}`);
  }
  if (!lines || lines.length === 0) return { ok: false, message: `${source.name} has no template to clone.` };

  const linePayload = lines.map((l) => ({
    company_id: companyId,
    section: l.section,
    sort_order: l.sort_order,
    kind: l.kind,
    key: l.key,
    label: l.label,
    grouping: l.grouping,
    manual_key: l.manual_key,
    fallback_grouping: l.fallback_grouping,
    negate: l.negate,
  }));
  const segPayload = (segments ?? []).map((s) => ({
    company_id: companyId,
    key: s.key,
    label: s.label,
    sort_order: s.sort_order,
    revenue_grouping: s.revenue_grouping,
    revenue_manual_key: s.revenue_manual_key,
    revenue_fallback_grouping: s.revenue_fallback_grouping,
    purchase_groupings: s.purchase_groupings,
  }));

  const insLines = await supabase.from("mis_template_lines").insert(linePayload);
  if (insLines.error) return actionFailed("cloneTemplateFrom", insLines.error, `Template not copied. ${TRY_AGAIN}`);
  if (segPayload.length > 0) {
    const insSegs = await supabase.from("mis_segments").insert(segPayload);
    if (insSegs.error) {
      return actionFailed("cloneTemplateFrom", insSegs.error, `Lines copied, but segments weren't. ${TRY_AGAIN}`);
    }
  }

  await logAudit({
    action: "edit_template",
    ...actorOf(actor),
    companyId,
    target: `cloned from ${source.name}`,
    detail: { sourceSlug, lines: linePayload.length, segments: segPayload.length },
  });
  revalidatePath("/c/[slug]", "layout");
  return {
    ok: true,
    message: `Copied ${plural(linePayload.length, "1 line", "{n} lines")} and ${plural(segPayload.length, "1 segment", "{n} segments")} from ${source.name}.`,
  };
}
