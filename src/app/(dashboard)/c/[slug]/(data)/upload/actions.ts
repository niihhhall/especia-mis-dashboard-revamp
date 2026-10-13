"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireCompany } from "@/lib/auth/guard";
import { getBranches, getLedgerMap, getMisTemplate } from "@/lib/data/mis";
import { actionFailed, parserMessage, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { plural } from "@/lib/format";
import { deriveCreditNatureGroupings } from "@/lib/mis/catalog";
import { parseAgeing } from "@/lib/ingest/parse-ageing";
import { parseStockInfo, parseTrialBalance } from "@/lib/ingest/parse-workbook";
import { normalizeTrialBalance } from "@/lib/ingest/normalize";
import {
  countMasterEdits,
  replaceAgeing,
  replaceMasterRows,
  saveStockInfo,
  seedBranches,
  upsertPeriod,
} from "@/lib/ingest/persist";
import { daysInMonth, periodFromMonthInput } from "@/lib/mis/period";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UploadState {
  ok: boolean;
  message: string;
  /**
   * Set when the month has manual edits, or unrecognised branch labels
   * (or both — the message covers whichever applies), that a re-upload
   * would replace/create. The form always resubmits with BOTH
   * `confirmDiscard` and `confirmNewBranches` set, so one retry resolves
   * everything the CA was actually shown.
   */
  needsConfirm?: boolean;
  /** What each supplied file contributed, for the result panel. */
  imported?: { label: string; rows: number }[];
  unmapped?: { ledger: string; classification: string; suggestion: string }[];
  periodLabel?: string;
}

/** Case/whitespace-insensitive match for a Tally branch-column label. */
function normalizeLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function fileBuffer(file: File | null): Promise<Uint8Array | null> {
  if (!file || file.size === 0) return null;
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * `slug` is curried in via `.bind(null, slug)` where the form wires this up
 * (see `upload-form.tsx`) — a Server Action has no `params` of its own.
 */
export async function uploadTrialBalance(
  slug: string,
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  // Ingestion runs as service-role and bypasses RLS, so this check is the only
  // thing preventing an unauthorised caller from rewriting Master Data.
  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const monthInput = String(formData.get("month") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(monthInput)) {
    return { ok: false, message: "Choose a reporting month." };
  }

  const tbBuf = await fileBuffer(formData.get("trialBalance") as File | null);
  if (!tbBuf) return { ok: false, message: "Upload a Trial Balance file." };

  try {
    const parsed = parseTrialBalance(tbBuf);
    if (parsed.rows.length === 0) {
      return {
        ok: false,
        message: "No Trial Balance rows found. Export the Trial Balance from Tally as .xls or .xlsx and upload it again.",
      };
    }

    const [ledgerMap, template] = await Promise.all([getLedgerMap(companyId), getMisTemplate(companyId)]);
    const creditNatureGroupings = deriveCreditNatureGroupings(template);
    const { rows, unmapped } = normalizeTrialBalance(parsed, ledgerMap, creditNatureGroupings);

    const { monthDate, label } = periodFromMonthInput(monthInput);
    const periodId = await upsertPeriod(companyId, monthDate, label, daysInMonth(monthInput));

    // replaceMasterRows deletes the month's rows, so any manual correction goes
    // with them. Refuse once and make the caller confirm rather than discarding
    // hand-entered figures silently.
    const editCount = await countMasterEdits(periodId);
    const confirmedDiscard = String(formData.get("confirmDiscard") ?? "") === "yes";
    const confirmedBranches = String(formData.get("confirmNewBranches") ?? "") === "yes";

    // Multi-branch file (parsed.branches has 2+ labels): reconcile them
    // against this company's existing branch roster. No roster yet ⇒ this
    // is the first multi-branch upload, seed every detected label with no
    // interrupt (nothing to reconcile against). A roster already exists ⇒
    // any label that doesn't match it needs an explicit confirm before being
    // created as a new branch — a renamed branch is indistinguishable from
    // "closed + new branch opened" by string matching alone, and one extra
    // click is worth not silently splitting a branch's history in two.
    let branchIdByLabel: Map<string, string> | undefined;
    let branchConfirmMessage: string | null = null;
    if (parsed.branches.length >= 2) {
      const existing = (await getBranches(companyId)).filter((b) => !b.archivedAt);
      const byNormLabel = new Map(existing.map((b) => [normalizeLabel(b.label), { id: b.id }]));
      const unmatched = parsed.branches.filter((l) => !byNormLabel.has(normalizeLabel(l)));

      if (existing.length > 0 && unmatched.length > 0 && !confirmedBranches) {
        branchConfirmMessage = plural(
          unmatched.length,
          `This branch isn't in the company's branch list yet: ${unmatched.join(", ")}. Confirm to add it as a new branch.`,
          `These branches aren't in the company's branch list yet: ${unmatched.join(", ")}. Confirm to add them as new branches.`,
        );
      } else {
        if (unmatched.length > 0) {
          const created = await seedBranches(companyId, unmatched, existing.length);
          for (const b of created) byNormLabel.set(normalizeLabel(b.label), { id: b.id });
        }
        branchIdByLabel = new Map(
          parsed.branches.map((l) => [l, byNormLabel.get(normalizeLabel(l))!.id]),
        );
      }
    }

    const needsEditConfirm = editCount > 0 && !confirmedDiscard;
    if (needsEditConfirm || branchConfirmMessage) {
      const parts: string[] = [];
      if (needsEditConfirm) {
        parts.push(
          plural(
            editCount,
            `${label} has 1 manual edit. Re-uploading replaces it with the Tally values.`,
            `${label} has {n} manual edits. Re-uploading replaces them with the Tally values.`,
          ),
        );
      }
      if (branchConfirmMessage) parts.push(branchConfirmMessage);
      return { ok: false, needsConfirm: true, message: parts.join(" ") };
    }

    await replaceMasterRows(companyId, periodId, rows, branchIdByLabel);

    const imported: { label: string; rows: number }[] = [
      { label: "Trial Balance", rows: rows.length },
    ];

    await logAudit({
      action: "upload_tb",
      ...actorOf(actor),
      companyId,
      periodId,
      target: label,
      detail: {
        rows: rows.length,
        unmapped: unmapped.length,
        replacedEdits: editCount,
        branches: parsed.branches.length || undefined,
      },
    });

    const stockBuf = await fileBuffer(formData.get("stockInfo") as File | null);
    if (stockBuf) {
      const stock = parseStockInfo(stockBuf);
      await saveStockInfo(companyId, periodId, stock);
      imported.push({ label: "Stock Info", rows: Object.keys(stock.closing).length });
    }

    // Both ageing files are optional and independent — a month may carry one,
    // both or neither, and each replaces only its own side.
    for (const [field, kind, label_] of [
      ["debtorsAgeing", "debtor", "Debtors Ageing"],
      ["creditorsAgeing", "creditor", "Creditors Ageing"],
    ] as const) {
      const buf = await fileBuffer(formData.get(field) as File | null);
      if (!buf) continue;
      const { rows: ageRows } = parseAgeing(buf);
      await replaceAgeing(companyId, periodId, kind, ageRows);
      imported.push({ label: label_, rows: ageRows.length });
      await logAudit({
        action: "upload_ageing",
        ...actorOf(actor),
        companyId,
        periodId,
        target: `${label} — ${kind}`,
        detail: { kind, rows: ageRows.length },
      });
    }

    // One call, not a list of report paths: every screen under /c/[slug] reads
    // from this company's Master TB, so invalidating the layout refreshes all of
    // them and cannot go stale by someone forgetting to add a new page here.
    revalidatePath("/c/[slug]", "layout");

    return {
      ok: true,
      message:
        `${label} imported: ${plural(rows.length, "1 ledger", "{n} ledgers")}` +
        (parsed.branches.length > 0 ? ` across ${plural(parsed.branches.length, "1 branch", "{n} branches")}` : "") +
        `.` +
        (editCount > 0
          ? ` ${plural(editCount, "1 manual edit was replaced.", "{n} manual edits were replaced.")}`
          : ""),
      imported,
      unmapped,
      periodLabel: label,
    };
  } catch (err) {
    return actionFailed(
      "uploadTrialBalance",
      err,
      parserMessage(err) ?? `Trial Balance not imported. ${TRY_AGAIN}`,
    );
  }
}

export interface DeletePeriodResult {
  ok: boolean;
  message: string;
}

/**
 * Permanently deletes one reporting month — the `periods` row and, via
 * `on delete cascade`, every `master_tb` / `manual_inputs` / `stock_info` /
 * `ageing` / `master_tb_edits` row under it. Not reachable from the
 * `confirmDiscard` re-upload flow above (that replaces a month's data, this
 * removes the month itself), so it gets its own confirm step in the UI.
 *
 * `audit_log.period_id` is `on delete set null`, so the audit trail survives
 * the deletion with the period's label recorded as free text.
 */
export async function deletePeriod(periodId: string, slug: string): Promise<DeletePeriodResult> {
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

  const admin = createAdminClient();

  // Confirm the period belongs to this company before touching it — the id
  // comes from the client, and requireCompany only proved the caller may act
  // on THIS company, not that the id they sent is actually one of its own.
  const { data: period, error: findErr } = await admin
    .from("periods")
    .select("id, label")
    .eq("id", periodId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (findErr) return actionFailed("findPeriod", findErr, `Month not loaded. ${TRY_AGAIN}`);
  if (!period) return { ok: false, message: "This month no longer exists. Reload the page to see the current list." };

  const { error } = await admin.from("periods").delete().eq("id", periodId);
  if (error) return actionFailed("deletePeriod", error, `${period.label} not deleted. ${TRY_AGAIN}`);

  await logAudit({
    action: "delete_period",
    ...actorOf(actor),
    companyId,
    target: period.label,
    detail: { periodId },
  });

  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `${period.label} deleted.` };
}

export interface GpDashboardState {
  ok: boolean;
  message: string;
}

const MAX_GP_DASHBOARD_BYTES = 10 * 1024 * 1024;

/**
 * Upload (or replace) one period's GP Dashboard — a self-contained HTML
 * working file the CA already produces outside this app, stored verbatim
 * (`periods.gp_dashboard_html`, `0013_gp_dashboard.sql`) and shown in an
 * iframe on the GP Dashboard report tab. Deliberately its own small form/
 * action, separate from `uploadTrialBalance` above, rather than one more
 * optional field bundled into that form — unlike Stock Info/Ageing (which
 * only make sense alongside a fresh Trial Balance for the same month), a CA
 * should be able to update an already-uploaded period's GP Dashboard on its
 * own, without needing to re-run a full Trial Balance import to do it.
 */
export async function uploadGpDashboard(
  _prev: GpDashboardState,
  formData: FormData,
): Promise<GpDashboardState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  const slug = String(formData.get("slug") ?? "");
  const periodId = String(formData.get("periodId") ?? "");
  if (!periodId) return { ok: false, message: "Choose a reporting month." };

  let companyId: string;
  let actor: Awaited<ReturnType<typeof requireCompany>>["profile"];
  try {
    ({ companyId, profile: actor } = await requireCompany(["ca", "admin"], slug));
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const file = formData.get("gpDashboard");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an HTML file." };
  }
  const looksLikeHtml = file.type === "text/html" || /\.html?$/i.test(file.name);
  if (!looksLikeHtml) {
    return { ok: false, message: "File must be an HTML file (.html)." };
  }
  if (file.size > MAX_GP_DASHBOARD_BYTES) {
    return { ok: false, message: "GP Dashboard file must be under 10 MB." };
  }
  const html = await file.text();

  const admin = createAdminClient();
  // Confirm the period belongs to this company before touching it — the id
  // comes from the client, and requireCompany only proved the caller may act
  // on THIS company, not that the id they sent is actually one of its own.
  const { data: period, error: findErr } = await admin
    .from("periods")
    .select("id, label")
    .eq("id", periodId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (findErr) return actionFailed("findPeriod", findErr, `Month not loaded. ${TRY_AGAIN}`);
  if (!period) return { ok: false, message: "This month no longer exists. Reload the page to see the current list." };

  const { error } = await admin.from("periods").update({ gp_dashboard_html: html }).eq("id", periodId);
  if (error) return actionFailed("uploadGpDashboard", error, `GP Dashboard not uploaded. ${TRY_AGAIN}`);

  await logAudit({
    action: "upload_gp_dashboard",
    ...actorOf(actor),
    companyId,
    periodId,
    target: period.label,
    detail: { bytes: file.size },
  });

  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `GP Dashboard uploaded for ${period.label}.` };
}

/**
 * Remove one period's GP Dashboard — sets `gp_dashboard_html` back to null
 * rather than deleting the period itself (that's `deletePeriod` above; this
 * is for clearing just the GP Dashboard while keeping the rest of the
 * period's data). A straight overwrite either way: re-uploading a new file
 * for a month that already has one (`uploadGpDashboard`'s plain `.update`)
 * already replaces the stored text outright, so there's never a second
 * copy sitting around to separately clean up — this action exists only for
 * "remove it without replacing it."
 */
export async function deleteGpDashboard(periodId: string, slug: string): Promise<GpDashboardState> {
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

  const admin = createAdminClient();
  const { data: period, error: findErr } = await admin
    .from("periods")
    .select("id, label")
    .eq("id", periodId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (findErr) return actionFailed("findPeriod", findErr, `Month not loaded. ${TRY_AGAIN}`);
  if (!period) return { ok: false, message: "This month no longer exists. Reload the page to see the current list." };

  const { error } = await admin.from("periods").update({ gp_dashboard_html: null }).eq("id", periodId);
  if (error) return actionFailed("deleteGpDashboard", error, `GP Dashboard not removed. ${TRY_AGAIN}`);

  await logAudit({
    action: "upload_gp_dashboard",
    ...actorOf(actor),
    companyId,
    periodId,
    target: period.label,
    detail: { removed: true },
  });

  revalidatePath("/c/[slug]", "layout");
  return { ok: true, message: `GP Dashboard removed for ${period.label}.` };
}
