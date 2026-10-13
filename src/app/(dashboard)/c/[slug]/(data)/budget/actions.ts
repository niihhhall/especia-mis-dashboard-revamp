"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getFyPeriods, getSelectedPeriod } from "@/lib/data/mis";
import { actionFailed, parserMessage, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { plural } from "@/lib/format";
import { parseBudgetTemplate } from "@/lib/ingest/parse-budget-template";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BulkBudgetState {
  ok: boolean;
  message: string;
}

const MAX_BUDGET_TEMPLATE_BYTES = 5 * 1024 * 1024;

/**
 * Bulk-applies a re-uploaded Budget template (see `budget-template-workbook.ts`
 * / `parse-budget-template.ts`). Mirrors `mapping/actions.ts`'s
 * `bulkApplyMapping` shape, but the core write is an UPSERT per non-blank
 * cell, never a delete-then-insert of the whole period — a blank cell in the
 * re-upload means "leave this (line, month) alone," not "clear it," so a CA
 * fixing one month and re-uploading the whole workbook can never silently
 * wipe every other month's already-entered figures.
 */
export async function bulkApplyBudget(_prev: BulkBudgetState, formData: FormData): Promise<BulkBudgetState> {
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
  if (file.size > MAX_BUDGET_TEMPLATE_BYTES) {
    return { ok: false, message: "File must be under 5 MB." };
  }

  const current = await getSelectedPeriod(companyId);
  if (!current) return { ok: false, message: "Upload a Trial Balance first." };
  const periods = await getFyPeriods(current, companyId);
  const periodIdByLabel = new Map(periods.map((p) => [p.label, p.id]));

  let cells: ReturnType<typeof parseBudgetTemplate>;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    cells = parseBudgetTemplate(buf);
  } catch (err) {
    return actionFailed(
      "bulkApplyBudget",
      err,
      parserMessage(err) ?? "File not read. Download the Budget template again, fill it in and re-upload it.",
    );
  }
  if (cells.length === 0) {
    return { ok: false, message: "No cells had a figure filled in — nothing to apply." };
  }

  const unknownPeriods = new Set<string>();
  const now = new Date().toISOString();
  const payload = cells
    .map((c) => {
      const periodId = periodIdByLabel.get(c.periodLabel);
      if (!periodId) {
        unknownPeriods.add(c.periodLabel);
        return null;
      }
      return { company_id: companyId, period_id: periodId, key: c.key, amount: c.amount, updated_at: now };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (payload.length === 0) {
    return {
      ok: false,
      message: `None of the filled-in columns matched this company's current financial year (${[...unknownPeriods].join(", ")}).`,
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("mis_budgets").upsert(payload, { onConflict: "period_id,key" });
  if (error) return actionFailed("bulkApplyBudget", error, `Budget not saved. ${TRY_AGAIN}`);

  await logAudit({
    action: "bulk_edit_budget",
    ...actorOf(actor),
    companyId,
    target: plural(payload.length, "1 cell", "{n} cells"),
    detail: { applied: payload.length, unknownPeriods: unknownPeriods.size },
  });

  revalidatePath("/c/[slug]", "layout");
  return {
    ok: true,
    message:
      `${plural(payload.length, "1 budget figure", "{n} budget figures")} applied.` +
      (unknownPeriods.size > 0
        ? ` ${plural(unknownPeriods.size, "1 column didn't match a known month and was skipped.", "{n} columns didn't match a known month and were skipped.")}`
        : ""),
  };
}
