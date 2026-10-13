import "server-only";

import { assertWritable, isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ManualInputs, MasterRow } from "@/lib/mis/types";

import type { AgeingRow } from "./parse-ageing";
import type { ParsedStockInfo } from "./parse-workbook";

// Trusted server-side writes for ingestion. Uses the admin (secret-key) client,
// which bypasses RLS. Never import from client code.

/** Create or update the reporting period; returns its id. */
export async function upsertPeriod(
  companyId: string,
  month: string, // YYYY-MM-01
  label: string,
  daysInPeriod: number | null,
): Promise<string> {
  assertWritable("upsertPeriod");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("periods")
    .upsert(
      { company_id: companyId, month, label, days_in_period: daysInPeriod, status: "published" },
      { onConflict: "company_id,month" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`upsertPeriod: ${error.message}`);
  return data.id;
}

/**
 * Replace all Master rows for a period (idempotent re-upload).
 *
 * `branchIdByLabel` resolves each row's `branchLabel` (set by
 * `normalizeTrialBalance` for a multi-branch upload — see
 * `parse-workbook.ts`'s `detectBranchBlocks`) to the `branches.id` the
 * upload action already reconciled/seeded. Omitted (or a row with no
 * `branchLabel`, i.e. every row of a legacy single-block upload) leaves
 * `branch_id` null — exactly today's behavior, unchanged.
 */
export async function replaceMasterRows(
  companyId: string,
  periodId: string,
  rows: MasterRow[],
  branchIdByLabel?: Map<string, string>,
): Promise<void> {
  assertWritable("replaceMasterRows");
  const supabase = createAdminClient();
  const del = await supabase.from("master_tb").delete().eq("period_id", periodId);
  if (del.error) throw new Error(`replaceMasterRows(delete): ${del.error.message}`);

  const payload = rows.map((r) => ({
    company_id: companyId,
    period_id: periodId,
    grouping: r.grouping,
    bs_pl: r.bsPl,
    particulars: r.particulars,
    classification: r.classification,
    opening: r.opening,
    debit: r.debit,
    credit: r.credit,
    closing: r.closing,
    unmapped: Boolean(r.unmapped),
    branch_id: r.branchLabel ? (branchIdByLabel?.get(r.branchLabel) ?? null) : null,
  }));
  const ins = await supabase.from("master_tb").insert(payload);
  if (ins.error) throw new Error(`replaceMasterRows(insert): ${ins.error.message}`);
}

/**
 * Create one `branches` row per given label, starting at `startSortOrder`.
 * Called only for labels the upload action has already determined are
 * genuinely new (first multi-branch upload for this company, or a CA-
 * confirmed new branch on a later one) — never speculatively.
 */
export async function seedBranches(
  companyId: string,
  labels: string[],
  startSortOrder: number,
): Promise<{ id: string; label: string }[]> {
  assertWritable("seedBranches");
  if (labels.length === 0) return [];
  const supabase = createAdminClient();

  const seen = new Set<string>();
  const payload = labels.map((label, i) => {
    let key = slugify(label);
    while (seen.has(key)) key = `${key}-${i}`; // defend against a slug collision within this batch
    seen.add(key);
    return { company_id: companyId, key, label, sort_order: startSortOrder + i };
  });

  const { data, error } = await supabase.from("branches").insert(payload).select("id, label");
  if (error) throw new Error(`seedBranches: ${error.message}`);
  return data ?? [];
}

/** "World Trade Jaipur - Indore" -> "world-trade-jaipur-indore". */
function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "branch"
  );
}

/**
 * Replace the per-period manual inputs (flattened to key/segment/value rows).
 *
 * The Adjustments form always submits every field, so its payload is the
 * COMPLETE set for the period — hence delete-then-insert rather than an upsert.
 * An upsert can only add or update, so a field the user cleared would keep its
 * old value and carry on flowing into the MIS pages even though the form
 * reported a successful save.
 */
/**
 * `branchId` scopes BOTH the delete and the insert to one branch (`null`
 * for a legacy single-branch company, matching today's behavior exactly) —
 * saving one branch's adjustments must never wipe another branch's. A
 * multi-branch company's Adjustments screen always has one specific branch
 * selected (see `inputs/page.tsx` — there's no "Consolidated" row to edit,
 * same reasoning as Master Data), so this mirrors `updateMasterCell`'s own
 * `branchId` parameter exactly.
 */
export async function saveManualInputs(
  companyId: string,
  periodId: string,
  mi: ManualInputs,
  branchId: string | null = null,
): Promise<void> {
  assertWritable("saveManualInputs");
  const supabase = createAdminClient();
  const rows: { company_id: string; period_id: string; key: string; segment: string; value: number; branch_id: string | null }[] = [];

  // No fixed key list — whatever scalar fields the caller set (universal
  // ones like closingStock, plus whatever manualKey values a company's own
  // template defines) get written as-is; manual_inputs.key is already free
  // text at the DB level.
  for (const [key, v] of Object.entries(mi)) {
    if (key === "segmentOpeningStock" || key === "segmentClosingStock") continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      rows.push({ company_id: companyId, period_id: periodId, key, segment: "", value: v, branch_id: branchId });
    }
  }
  for (const [key, values] of [
    ["segmentOpeningStock", mi.segmentOpeningStock],
    ["segmentClosingStock", mi.segmentClosingStock],
  ] as const) {
    if (!values) continue;
    for (const [seg, value] of Object.entries(values)) {
      rows.push({ company_id: companyId, period_id: periodId, key, segment: seg, value, branch_id: branchId });
    }
  }

  let del = supabase.from("manual_inputs").delete().eq("period_id", periodId);
  del = branchId ? del.eq("branch_id", branchId) : del.is("branch_id", null);
  const { error: delErr } = await del;
  if (delErr) throw new Error(`saveManualInputs(delete): ${delErr.message}`);

  if (rows.length === 0) return; // every field cleared — the delete above is the save
  const ins = await supabase.from("manual_inputs").insert(rows);
  if (ins.error) throw new Error(`saveManualInputs(insert): ${ins.error.message}`);
}

/** Persist parsed Stock Info categories for a period. */
export async function saveStockInfo(
  companyId: string,
  periodId: string,
  stock: ParsedStockInfo,
): Promise<void> {
  assertWritable("saveStockInfo");
  const supabase = createAdminClient();
  const categories = new Set([...Object.keys(stock.opening), ...Object.keys(stock.closing)]);
  const payload = [...categories]
    .filter((c) => c.toUpperCase() !== "TOTAL")
    .map((category) => ({
      company_id: companyId,
      period_id: periodId,
      category,
      opening_value: stock.opening[category] ?? 0,
      closing_value: stock.closing[category] ?? 0,
    }));
  if (payload.length === 0) return;
  await supabase.from("stock_info").delete().eq("period_id", periodId);
  const ins = await supabase.from("stock_info").insert(payload);
  if (ins.error) throw new Error(`saveStockInfo: ${ins.error.message}`);
}

/**
 * Replace one side of a period's ageing (debtor or creditor).
 *
 * The delete is scoped to BOTH period and kind so re-uploading just the debtors
 * file leaves the creditors rows alone — the two arrive as separate files and
 * are often refreshed independently.
 */
export async function replaceAgeing(
  companyId: string,
  periodId: string,
  kind: "debtor" | "creditor",
  rows: AgeingRow[],
): Promise<void> {
  assertWritable("replaceAgeing");
  const supabase = createAdminClient();

  const del = await supabase
    .from("ageing")
    .delete()
    .eq("period_id", periodId)
    .eq("kind", kind);
  if (del.error) throw new Error(`replaceAgeing(delete ${kind}): ${del.error.message}`);

  if (rows.length === 0) return; // an empty file clears the side

  const payload = rows.map((r) => ({
    company_id: companyId,
    period_id: periodId,
    kind,
    party: r.party,
    b0_30: r.b0_30,
    b30_60: r.b30_60,
    b60_90: r.b60_90,
    b90_180: r.b90_180,
    b180_plus: r.b180_plus,
    total: r.total,
  }));
  const ins = await supabase.from("ageing").insert(payload);
  if (ins.error) throw new Error(`replaceAgeing(insert ${kind}): ${ins.error.message}`);
}

/** The only columns a manual edit may touch. */
export const EDITABLE_FIELDS = ["opening", "debit", "credit", "closing"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

/**
 * Apply one manual correction to a Master TB cell and record it.
 *
 * `field` names a database column, so it is checked against the whitelist here
 * rather than trusted from the caller — an arbitrary string would be an
 * injection surface even through the query builder.
 *
 * The old value is read first so the history row records what it replaced;
 * that log is what makes the edit auditable and recoverable after a re-upload.
 *
 * `branchId` disambiguates which row to touch when 2+ branches share a
 * `particulars` value (a multi-branch upload) — without it, `.maybeSingle()`
 * below would error outright once that happens. `null` (the default, and
 * the only value a single-branch company's Master Data screen ever passes)
 * matches a legacy row exactly as before — `.is("branch_id", null)`, not
 * `.eq(...)`, since SQL/PostgREST never matches `= null`.
 */
export async function updateMasterCell(
  companyId: string,
  periodId: string,
  particulars: string,
  field: EditableField,
  value: number,
  editedBy: string,
  branchId: string | null = null,
): Promise<{ oldValue: number }> {
  assertWritable("updateMasterCell");
  if (!EDITABLE_FIELDS.includes(field)) {
    throw new Error(`updateMasterCell: ${field} is not an editable column.`);
  }
  if (!Number.isFinite(value)) throw new Error("updateMasterCell: value must be a number.");

  const supabase = createAdminClient();

  let query = supabase
    .from("master_tb")
    .select(`id, ${field}`)
    .eq("period_id", periodId)
    .eq("particulars", particulars);
  query = branchId ? query.eq("branch_id", branchId) : query.is("branch_id", null);
  const { data: existing, error: readErr } = await query.maybeSingle();
  if (readErr) throw new Error(`updateMasterCell(read): ${readErr.message}`);
  if (!existing) throw new Error(`No "${particulars}" row in this period.`);

  const oldValue = Number((existing as Record<string, unknown>)[field] ?? 0);
  if (oldValue === value) return { oldValue }; // nothing changed — do not log noise

  // Built explicitly rather than as a computed key: a computed key widens to a
  // string index signature, which the generated table types reject outright.
  const patch =
    field === "opening"
      ? { opening: value }
      : field === "debit"
        ? { debit: value }
        : field === "credit"
          ? { credit: value }
          : { closing: value };

  const upd = await supabase
    .from("master_tb")
    .update(patch)
    .eq("id", (existing as { id: string }).id);
  if (upd.error) throw new Error(`updateMasterCell(update): ${upd.error.message}`);

  const log = await supabase.from("master_tb_edits").insert({
    company_id: companyId,
    period_id: periodId,
    particulars,
    field,
    old_value: oldValue,
    new_value: value,
    edited_by: editedBy,
    branch_id: branchId,
  });
  if (log.error) throw new Error(`updateMasterCell(log): ${log.error.message}`);

  return { oldValue };
}

/** How many manual edits exist for a period — used to warn before a re-upload. */
export async function countMasterEdits(periodId: string): Promise<number> {
  if (isDemoMode()) return 0;
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("master_tb_edits")
    .select("id", { count: "exact", head: true })
    .eq("period_id", periodId);
  if (error) throw new Error(`countMasterEdits: ${error.message}`);
  return count ?? 0;
}
