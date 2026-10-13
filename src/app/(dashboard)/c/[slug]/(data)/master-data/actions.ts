"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getSelectedPeriod } from "@/lib/data/mis";
import { actionFailed, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { EDITABLE_FIELDS, updateMasterCell, type EditableField } from "@/lib/ingest/persist";

export interface CellEditResult {
  ok: boolean;
  message: string;
}

/**
 * Apply one manual correction to a Master TB cell.
 *
 * The (data) route group already keeps company users off the page, but a server
 * action is a separately addressable POST endpoint — so this guards itself.
 * Master TB is what every report derives from; an unguarded write here would be
 * an unauthenticated edit of the client's financial statements.
 */
export async function editMasterCell(formData: FormData, slug: string): Promise<CellEditResult> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let userId: string;
  let companyId: string;
  try {
    const gate = await requireCompany(["ca", "admin"], slug);
    userId = gate.profile.userId;
    companyId = gate.companyId;
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const particulars = String(formData.get("particulars") ?? "").trim();
  const field = String(formData.get("field") ?? "") as EditableField;
  const raw = String(formData.get("value") ?? "").replace(/,/g, "").trim();
  // Set by MasterTable/EditableCell to whichever branch the page is
  // currently showing (see master-data/page.tsx) — null for a legacy
  // single-branch period, exactly as before this parameter existed.
  const branchId = String(formData.get("branchId") ?? "").trim() || null;

  if (!particulars) return { ok: false, message: "Missing ledger." };
  if (!EDITABLE_FIELDS.includes(field)) return { ok: false, message: "That column is not editable." };

  const value = Number(raw);
  if (raw === "" || !Number.isFinite(value)) return { ok: false, message: "Enter a number." };

  try {
    const period = await getSelectedPeriod(companyId);
    if (!period) return { ok: false, message: "No reporting period selected." };

    await updateMasterCell(companyId, period.id, particulars, field, value, userId, branchId);

    // Master TB feeds every report, so refresh all of them — this is what makes
    // an edit "drive the full report" rather than just the table it was typed in.
    // One call, not a list of report paths: every screen under /c/[slug] reads
    // from this company's Master TB, so invalidating the layout refreshes all of
    // them and cannot go stale by someone forgetting to add a new page here.
    revalidatePath("/c/[slug]", "layout");

    return { ok: true, message: `"${particulars}" saved.` };
  } catch (e) {
    return actionFailed("editMasterCell", e, `Figure not saved. ${TRY_AGAIN}`);
  }
}
