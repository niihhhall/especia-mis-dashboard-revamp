"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireRole } from "@/lib/auth/guard";
import { actionFailed, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { plural } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NewCompanyState {
  ok: boolean;
  message: string;
  slug?: string;
}

/** "Tirupati Automart Private Limited" → "tirupati-automart-private-limited". */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Onboard a client.
 *
 * Runs as service-role, so `requireRole` is the whole of the authorisation.
 * A CA who creates a company is assigned to it in the same breath — otherwise
 * they would create a client and immediately lose sight of it, since a CA only
 * sees companies in `ca_companies`.
 */
export async function createCompany(
  _prev: NewCompanyState,
  formData: FormData,
): Promise<NewCompanyState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let profile: Awaited<ReturnType<typeof requireRole>>;
  try {
    profile = await requireRole(["ca", "admin"]);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Enter the company name." };

  const group = String(formData.get("group") ?? "").trim() || null;
  const requested = String(formData.get("slug") ?? "").trim();
  const slug = slugify(requested || name);
  if (!slug) return { ok: false, message: "That name has no letters or digits to build a link from." };

  const fyStart = Number(formData.get("fyStart") ?? 4);
  if (!Number.isInteger(fyStart) || fyStart < 1 || fyStart > 12) {
    return { ok: false, message: "Choose the month the financial year starts." };
  }

  const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .insert({
      slug,
      name,
      group_name: group,
      fy_start_month: fyStart,
      pan: optional("pan"),
      gst: optional("gst"),
      cin: optional("cin"),
      address: optional("address"),
    })
    .select("id, slug")
    .single();

  if (error) {
    // The slug is the company's address, so a clash is a real conflict rather
    // than something to silently disambiguate behind the user's back.
    if (error.code === "23505") {
      return { ok: false, message: `The link "${slug}" is already taken. Give this company a different short name.` };
    }
    return actionFailed("createCompany", error, `Company not added. ${TRY_AGAIN}`);
  }

  if (profile.role === "ca") {
    const link = await admin
      .from("ca_companies")
      .insert({ ca_id: profile.userId, company_id: data.id });
    if (link.error) {
      return actionFailed(
        "createCompany",
        link.error,
        "Company added, but it isn't assigned to you yet. Ask an administrator to assign it on the Users page.",
      );
    }
  }

  await logAudit({
    action: "company_create",
    ...actorOf(profile),
    companyId: data.id,
    target: name,
    detail: { slug: data.slug, group },
  });

  revalidatePath("/companies");
  return { ok: true, message: `${name} added.`, slug: data.slug };
}

export interface CompanyActionState {
  ok: boolean;
  message: string;
}

/**
 * Edit an existing client's details — everything `createCompany` accepts
 * except the slug, which stays fixed once set (it's the company's address:
 * changing it would break every bookmarked/exported link into that client).
 * `ca` and `admin` both may edit, matching who may create a company; a CA
 * can only reach a company they're already assigned to, enforced by
 * `requireRole`'s `companyId` check exactly like every company-scoped
 * write in this app.
 */
export async function updateCompany(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { ok: false, message: "This company no longer exists. Reload the page to see the current list." };

  let profile: Awaited<ReturnType<typeof requireRole>>;
  try {
    profile = await requireRole(["ca", "admin"], companyId);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Enter the company name." };

  const group = String(formData.get("group") ?? "").trim() || null;

  const fyStart = Number(formData.get("fyStart") ?? 4);
  if (!Number.isInteger(fyStart) || fyStart < 1 || fyStart > 12) {
    return { ok: false, message: "Choose the month the financial year starts." };
  }

  const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({
      name,
      group_name: group,
      fy_start_month: fyStart,
      pan: optional("pan"),
      gst: optional("gst"),
      cin: optional("cin"),
      address: optional("address"),
    })
    .eq("id", companyId);
  if (error) return actionFailed("updateCompany", error, `Changes not saved. ${TRY_AGAIN}`);

  await logAudit({
    action: "company_update",
    ...actorOf(profile),
    companyId,
    target: name,
    detail: { group },
  });

  revalidatePath("/companies");
  return { ok: true, message: `${name} updated.` };
}

/**
 * Archive a company (soft-delete) — admin only. The row and everything under
 * it is untouched; it's just excluded from `listCompanies()`'s default
 * result (see `company-context.ts`), so it drops out of the switcher and the
 * active Companies grid but every page under `/c/[slug]/...` still works for
 * anyone who navigates there directly. `unarchiveCompany` reverses it.
 *
 * Deliberately `admin`-only, unlike edit/create which both `ca` and `admin`
 * may do — removing a client from view is a firm-level decision, not
 * something any assigned CA should be able to do to a colleague's client.
 */
export async function archiveCompany(companyId: string): Promise<CompanyActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let profile: Awaited<ReturnType<typeof requireRole>>;
  try {
    profile = await requireRole(["admin"], companyId);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from("companies").select("name").eq("id", companyId).maybeSingle();
  if (!row) return { ok: false, message: "This company no longer exists. Reload the page to see the current list." };

  const { error } = await admin
    .from("companies")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) return actionFailed("archiveCompany", error, `Company not archived. ${TRY_AGAIN}`);

  await logAudit({ action: "company_archive", ...actorOf(profile), companyId, target: row.name });
  revalidatePath("/companies");
  return { ok: true, message: `${row.name} archived.` };
}

/** Reverses `archiveCompany` — admin only, same reasoning. */
export async function unarchiveCompany(companyId: string): Promise<CompanyActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let profile: Awaited<ReturnType<typeof requireRole>>;
  try {
    profile = await requireRole(["admin"], companyId);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from("companies").select("name").eq("id", companyId).maybeSingle();
  if (!row) return { ok: false, message: "This company no longer exists. Reload the page to see the current list." };

  const { error } = await admin
    .from("companies")
    .update({ archived_at: null })
    .eq("id", companyId);
  if (error) return actionFailed("unarchiveCompany", error, `Company not restored. ${TRY_AGAIN}`);

  await logAudit({ action: "company_unarchive", ...actorOf(profile), companyId, target: row.name });
  revalidatePath("/companies");
  return { ok: true, message: `${row.name} restored.` };
}

/**
 * Permanently delete a company — admin only, and irreversible: every table
 * with `company_id` cascades (`references public.companies(id) on delete
 * cascade` — Master TB, ledger map, template, periods, ageing, branches, the
 * lot; `on delete cascade` migrations confirmed across every one of them).
 * `audit_log.company_id` is `on delete set null` by design, so this action's
 * own log entry — and every earlier one for this company — survives with the
 * company reference cleared, same as branch deletion's audit trail.
 *
 * `confirmName` must match the company's real name exactly — archiving
 * already has its own lighter armed/confirm UI; a whole company's financial
 * history disappearing forever warrants one more deliberate step than a
 * branch or a channel group does.
 */
export async function deleteCompanyPermanently(
  companyId: string,
  confirmName: string,
): Promise<CompanyActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let profile: Awaited<ReturnType<typeof requireRole>>;
  try {
    profile = await requireRole(["admin"], companyId);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from("companies").select("name").eq("id", companyId).maybeSingle();
  if (!row) return { ok: false, message: "This company no longer exists. Reload the page to see the current list." };
  if (confirmName.trim() !== row.name) {
    return { ok: false, message: "Company name didn't match — nothing was deleted." };
  }

  // A company-role login (`profiles.role = 'company'`) can't exist without a
  // company to point at (`profiles_company_required`) — Postgres would reject
  // the delete once `profiles.company_id` is set null by the FK, but only
  // after the DB round trip, with a raw constraint-name error. Check first so
  // the admin gets a plain, actionable message instead.
  const { count: clientLogins } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "company");
  if (clientLogins && clientLogins > 0) {
    return {
      ok: false,
      message: plural(
        clientLogins,
        `${row.name} has 1 client user. Remove them on the Users page first, then delete the company.`,
        `${row.name} has {n} client users. Remove them on the Users page first, then delete the company.`,
      ),
    };
  }

  const { error } = await admin.from("companies").delete().eq("id", companyId);
  if (error) return actionFailed("deleteCompanyPermanently", error, `Company not deleted. ${TRY_AGAIN}`);

  // No `companyId` here — the row is already gone, and `audit_log.company_id`
  // is a real FK (`on delete set null` only rewrites *existing* rows; a new
  // insert against a since-deleted id still fails validation). `target`
  // already carries the human-readable name for this entry.
  await logAudit({ action: "company_delete", ...actorOf(profile), target: row.name });
  revalidatePath("/companies");
  return { ok: true, message: `${row.name} permanently deleted.` };
}

export interface LogoActionState {
  ok: boolean;
  message: string;
  logoUrl?: string | null;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Upload (or replace) a company's logo into the public `company-logos`
 * Storage bucket (`0012_company_settings.sql`) and point `companies.logo_url`
 * at it. Every upload gets a fresh, timestamped path rather than overwriting
 * the previous file in place — a stable filename would risk a viewer's
 * browser (or a CDN in front of production) serving the stale cached image
 * after a re-upload; a new path is always a cache miss. The old file is left
 * behind rather than deleted — logo changes are rare enough that the
 * leftover storage cost isn't worth the extra failure mode of a delete call
 * that could fail independently of the upload that matters.
 */
export async function uploadCompanyLogo(
  _prev: LogoActionState,
  formData: FormData,
): Promise<LogoActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { ok: false, message: "This company no longer exists. Reload the page to see the current list." };

  let profile: Awaited<ReturnType<typeof requireRole>>;
  try {
    profile = await requireRole(["ca", "admin"], companyId);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file." };
  }
  const ext = LOGO_EXT_BY_TYPE[file.type];
  if (!ext) {
    return { ok: false, message: "Logo must be a PNG, JPEG, WebP, or SVG image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, message: "Logo must be under 2 MB." };
  }

  const path = `${companyId}/logo-${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("company-logos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return actionFailed(
      "uploadCompanyLogo",
      uploadError,
      "Logo not uploaded. Try again with a PNG, JPEG, WebP or SVG under 2 MB.",
    );
  }

  const { data: pub } = admin.storage.from("company-logos").getPublicUrl(path);

  const { error } = await admin.from("companies").update({ logo_url: pub.publicUrl }).eq("id", companyId);
  if (error) return actionFailed("uploadCompanyLogo", error, `Logo not saved. ${TRY_AGAIN}`);

  await logAudit({ action: "company_logo_update", ...actorOf(profile), companyId });
  revalidatePath("/companies");
  return { ok: true, message: "Logo updated.", logoUrl: pub.publicUrl };
}

/** Clears a company's logo back to the initials avatar. Same access as upload. */
export async function removeCompanyLogo(companyId: string): Promise<LogoActionState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let profile: Awaited<ReturnType<typeof requireRole>>;
  try {
    profile = await requireRole(["ca", "admin"], companyId);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("companies").update({ logo_url: null }).eq("id", companyId);
  if (error) return actionFailed("removeCompanyLogo", error, `Logo not removed. ${TRY_AGAIN}`);

  await logAudit({ action: "company_logo_update", ...actorOf(profile), companyId, detail: { removed: true } });
  revalidatePath("/companies");
  return { ok: true, message: "Logo removed.", logoUrl: null };
}
