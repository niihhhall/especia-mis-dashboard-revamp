"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getMisSegments, getMisTemplate, getSelectedPeriod } from "@/lib/data/mis";
import { actionFailed, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { saveManualInputs } from "@/lib/ingest/persist";
import type { ManualInputs, SegmentValues } from "@/lib/mis/types";

/** Universal manual-input fields every company has, regardless of its own template. */
const UNIVERSAL_MANUAL_KEYS = ["closingStock", "depreciation", "interestExpense"];

export interface InputsState {
  ok: boolean;
  message: string;
}

const num = (fd: FormData, key: string): number | undefined => {
  const raw = fd.get(key);
  if (raw == null || String(raw).trim() === "") return undefined;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
};

/**
 * `slug` is curried in via `.bind(null, slug)` where the form wires this up
 * (see `inputs-form.tsx`) — a Server Action has no `params` of its own, and
 * this is Next's own documented way to carry extra server-side context into
 * one alongside the `useActionState` state/formData Next.js manages itself.
 */
export async function saveInputs(
  slug: string,
  _prev: InputsState,
  formData: FormData,
): Promise<InputsState> {
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

  const period = await getSelectedPeriod(companyId);
  if (!period) return { ok: false, message: "Upload a Trial Balance first." };

  // The set of manual fields/segments this company's own template defines —
  // not a fixed list, so a differently-configured company's Adjustments
  // form (built from the same template by inputs-form.tsx) reads back
  // correctly here too.
  const [template, segments] = await Promise.all([getMisTemplate(companyId), getMisSegments(companyId)]);
  const manualKeys = [...new Set(template.filter((l) => l.kind === "manual").map((l) => l.manualKey!))];

  const mi: ManualInputs = {};
  for (const key of [...UNIVERSAL_MANUAL_KEYS, ...manualKeys]) {
    const v = num(formData, key);
    if (v !== undefined) mi[key] = v;
  }

  // Segment stock splits — only the fields actually filled in are saved; a
  // segment left blank simply reads as 0 downstream (segment.ts's `?? 0`),
  // so there's no need to zero-fill the rest the way a fixed 3-segment list
  // used to require.
  const segOpen: SegmentValues = {};
  const segClose: SegmentValues = {};
  for (const seg of segments) {
    const o = num(formData, `segOpen_${seg.key}`);
    const c = num(formData, `segClose_${seg.key}`);
    if (o !== undefined) segOpen[seg.key] = o;
    if (c !== undefined) segClose[seg.key] = c;
  }
  if (Object.keys(segOpen).length > 0) mi.segmentOpeningStock = segOpen;
  if (Object.keys(segClose).length > 0) mi.segmentClosingStock = segClose;

  // Set by InputsForm to whichever branch the page is currently showing
  // (see inputs/page.tsx) — null for a legacy single-branch period, exactly
  // as before this parameter existed.
  const branchId = String(formData.get("branchId") ?? "").trim() || null;

  try {
    await saveManualInputs(companyId, period.id, mi, branchId);
    await logAudit({
      action: "save_adjustments",
      ...actorOf(actor),
      companyId,
      periodId: period.id,
      target: period.label,
      // Which fields were set, not their values — the values themselves are
      // already visible on the Adjustments screen; the log is for "what
      // changed and when", not a second copy of the figures.
      detail: { fields: Object.keys(mi) },
    });
    // One call, not a list of report paths: every screen under /c/[slug] reads
    // from this company's Master TB, so invalidating the layout refreshes all of
    // them and cannot go stale by someone forgetting to add a new page here.
    revalidatePath("/c/[slug]", "layout");
    return { ok: true, message: `Adjustments saved for ${period.label}.` };
  } catch (e) {
    return actionFailed("saveInputs", e, `Adjustments not saved. ${TRY_AGAIN}`);
  }
}
