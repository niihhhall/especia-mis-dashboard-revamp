"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getLedgerMap, getMisTemplate } from "@/lib/data/mis";
import { actionFailed, parserMessage, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { plural } from "@/lib/format";
import { parseMappingTemplate } from "@/lib/ingest/parse-mapping-template";
import { guessBsPl } from "@/lib/mis/bs-pl";
import { UNIVERSAL_NO_TEMPLATE_GROUPINGS, type TemplateSection } from "@/lib/mis/catalog";
import { keyFromGrouping } from "@/lib/mis/template-key";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MappingState {
  ok: boolean;
  message: string;
}

/**
 * One past the highest sort_order already in this company/section, so a new
 * auto-created line always lands after every existing one instead of
 * colliding with other new lines on a shared placeholder value — a fixed
 * placeholder (this used to insert every new line at sort_order 999) makes
 * the Template page's Move up/down jump rows once enough lines share it,
 * since "adjacent" among tied rows is no longer stable.
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
 * Assign (or re-assign) a ledger's grouping. Upserts the ledger_map entry and
 * propagates the change to any existing master_tb rows for that ledger (clearing
 * the unmapped flag), so the Master Data and MIS pages update without re-upload.
 */
export async function saveMapping(formData: FormData, slug: string): Promise<MappingState> {
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

  const ledger = String(formData.get("ledger") ?? "").trim();
  const grouping = String(formData.get("grouping") ?? "").trim();
  const bsPl = String(formData.get("bsPl") ?? "").trim() === "P.L" ? "P.L" : "B.S";
  const classification = String(formData.get("classification") ?? "").trim() || null;

  if (!ledger || !grouping) return { ok: false, message: "Ledger and grouping are required." };

  const supabase = createAdminClient();

  const map = await supabase
    .from("ledger_map")
    .upsert(
      {
        company_id: companyId,
        ledger_name: ledger,
        grouping,
        bs_pl: bsPl,
        classification,
        source: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,ledger_name" },
    );
  if (map.error) return actionFailed("saveMapping", map.error, `Mapping not saved. ${TRY_AGAIN}`);

  const upd = await supabase
    .from("master_tb")
    .update({ grouping, bs_pl: bsPl, unmapped: false })
    .eq("company_id", companyId)
    .eq("particulars", ledger);
  if (upd.error) {
    return actionFailed("saveMapping", upd.error, `Mapping saved, but Master Data wasn't updated. Save the mapping again.`);
  }

  // Auto-drive into the MIS Template: a CA picking a Section alongside the
  // grouping (see mapping-editor.tsx's Section picker) means "this grouping
  // also needs a template line" — skip it for a grouping the engine already
  // computes directly (UNIVERSAL_NO_TEMPLATE_GROUPINGS) and skip it if a
  // template line already covers this grouping, so re-saving a mapping never
  // creates a duplicate line or silently overwrites a CA's own customization
  // (label/kind/negate) on an existing one. The resulting line is ordinary —
  // fully visible and editable on the Template page afterward, same as any
  // hand-added line.
  const section = String(formData.get("section") ?? "").trim() as TemplateSection | "";
  let templateNote = "";
  if (section && !UNIVERSAL_NO_TEMPLATE_GROUPINGS.has(grouping)) {
    const { data: existingLines } = await supabase
      .from("mis_template_lines")
      .select("id")
      .eq("company_id", companyId)
      .eq("grouping", grouping)
      .limit(1);
    if (!existingLines || existingLines.length === 0) {
      const negate = section === "revenue" || section === "indirect_income";
      let key = keyFromGrouping(grouping);
      const { data: keyClash } = await supabase
        .from("mis_template_lines")
        .select("id")
        .eq("company_id", companyId)
        .eq("key", key)
        .limit(1);
      if (keyClash && keyClash.length > 0) key = `${key}2`;
      const ins = await supabase.from("mis_template_lines").insert({
        company_id: companyId,
        section,
        sort_order: await nextSortOrder(supabase, companyId, section),
        kind: "grouping",
        key,
        label: grouping,
        grouping,
        negate,
      });
      if (!ins.error) templateNote = ` Added to MIS Template → ${section.replace(/_/g, " ")}.`;
    }
  }

  await logAudit({
    action: "edit_mapping",
    ...actorOf(actor),
    companyId,
    target: ledger,
    detail: { grouping, bsPl, classification, section: section || undefined },
  });

  // One call, not a list of report paths: every screen under /c/[slug] reads
  // from this company's Master TB, so invalidating the layout refreshes all of
  // them and cannot go stale by someone forgetting to add a new page here.
  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `Mapped “${ledger}” → ${grouping}.${templateNote}` };
}

export interface BulkMappingState {
  ok: boolean;
  message: string;
}

const MAX_BULK_MAPPING_BYTES = 5 * 1024 * 1024;

/**
 * Applies every row of a re-uploaded mapping-template workbook (see
 * `/c/[slug]/mapping/template`'s download route and
 * `parse-mapping-template.ts`) in one shot — the bulk counterpart to
 * `saveMapping` above. One batched `ledger_map` upsert regardless of ledger
 * count, then a `master_tb` sync per CHANGED ledger (bounded by unique
 * ledger count, not row count — the same cost shape `saveMapping` already
 * has, just parallelized instead of one-row-at-a-time through the UI).
 */
export async function bulkApplyMapping(_prev: BulkMappingState, formData: FormData): Promise<BulkMappingState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  const slug = String(formData.get("slug") ?? "");
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose the filled-in template file." };
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return { ok: false, message: "File must be the downloaded .xlsx template." };
  }
  if (file.size > MAX_BULK_MAPPING_BYTES) {
    return { ok: false, message: "File must be under 5 MB." };
  }

  let parsedRows: ReturnType<typeof parseMappingTemplate>;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    parsedRows = parseMappingTemplate(buf);
  } catch (err) {
    return actionFailed(
      "bulkApplyMapping",
      err,
      parserMessage(err) ?? "File not read. Download the mapping template again, fill it in and re-upload it.",
    );
  }
  if (parsedRows.length === 0) {
    return { ok: false, message: "No rows had a New Grouping filled in — nothing to apply." };
  }

  const [template, priorMap] = await Promise.all([getMisTemplate(companyId), getLedgerMap(companyId)]);
  const knownGroupings = new Set([
    ...template.map((l) => (l.kind === "manual" ? l.fallbackGrouping : l.grouping)).filter((g): g is string => Boolean(g)),
    ...priorMap.map((e) => e.grouping),
  ]);

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const map = await supabase.from("ledger_map").upsert(
    parsedRows.map((r) => ({
      company_id: companyId,
      ledger_name: r.ledger,
      grouping: r.grouping,
      bs_pl: r.bsPl ?? guessBsPl(r.classification),
      classification: r.classification,
      // ledger_map.source has a check constraint of only 'auto'/'manual' — a
      // bulk Excel edit is still a human decision, just made offline, so it
      // gets the same value the one-row editor's saveMapping() already uses.
      source: "manual",
      updated_at: now,
    })),
    { onConflict: "company_id,ledger_name" },
  );
  if (map.error) return actionFailed("bulkApplyMapping", map.error, `Mapping not applied. ${TRY_AGAIN}`);

  const updates = await Promise.all(
    parsedRows.map((r) =>
      supabase
        .from("master_tb")
        .update({ grouping: r.grouping, bs_pl: r.bsPl ?? guessBsPl(r.classification), unmapped: false })
        .eq("company_id", companyId)
        .eq("particulars", r.ledger),
    ),
  );
  const failed = updates.find((u) => u.error);
  if (failed?.error) {
    return actionFailed(
      "bulkApplyMapping",
      failed.error,
      "Mapping saved, but Master Data wasn't fully updated. Upload the file again.",
    );
  }

  const unknownGrouping = parsedRows.filter((r) => !knownGroupings.has(r.grouping)).length;

  await logAudit({
    action: "bulk_edit_mapping",
    ...actorOf(actor),
    companyId,
    target: plural(parsedRows.length, "1 ledger", "{n} ledgers"),
    detail: { applied: parsedRows.length, unknownGrouping },
  });

  revalidatePath("/c/[slug]", "layout");
  return {
    ok: true,
    message:
      `${plural(parsedRows.length, "1 ledger mapping", "{n} ledger mappings")} applied.` +
      (unknownGrouping > 0
        ? ` ${plural(unknownGrouping, "1 uses a grouping", "{n} use a grouping")} not in your MIS Template or existing map. Check for typos.`
        : ""),
  };
}
