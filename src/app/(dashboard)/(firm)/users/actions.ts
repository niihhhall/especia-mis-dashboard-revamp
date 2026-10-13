"use server";

import { revalidatePath } from "next/cache";

import { actorOf, logAudit } from "@/lib/audit/log";
import { AuthError, requireRole } from "@/lib/auth/guard";
import type { AppRole } from "@/lib/auth/session";
import { actionFailed, TRY_AGAIN } from "@/lib/action-error";
import { demoWriteBlocked } from "@/lib/demo/mode";
import { ROLE_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserFormState {
  ok: boolean;
  message: string;
}

const ROLES: AppRole[] = ["admin", "ca", "company"];

function isRole(v: FormDataEntryValue | null): v is AppRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

/**
 * Provision a login.
 *
 * There is no self-signup (`enable_signup = false`, see `login/actions.ts`),
 * so this — an admin, through the service-role client — is the only way an
 * account ever comes to exist. That is what stops someone registering
 * themselves against a company that is not theirs.
 */
export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let actor: Awaited<ReturnType<typeof requireRole>>;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role");
  const companyId = String(formData.get("companyId") ?? "").trim() || null;
  const assigned = formData.getAll("assignedCompanyIds").map(String).filter(Boolean);

  if (!email || !password) return { ok: false, message: "Email and password are required." };
  if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
  if (!isRole(role)) return { ok: false, message: "Choose a role." };
  if (role === "company" && !companyId) {
    return { ok: false, message: "Choose the company this client user belongs to." };
  }

  const admin = createAdminClient();

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no email flow yet — admin hands the password out directly
  });
  if (authErr) {
    // A duplicate email is the one auth failure the admin can fix from the form.
    if (authErr.code === "email_exists" || /already/i.test(authErr.message)) {
      console.error("[createUser]", authErr);
      return { ok: false, message: "A user with this email already exists. Use a different email." };
    }
    return actionFailed("createUser", authErr, `User not added. ${TRY_AGAIN}`);
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role,
    company_id: role === "company" ? companyId : null,
    name: name || null,
    email,
  });
  if (profileErr) {
    // The auth account exists but has no profile — rather than leave an
    // orphaned login nobody can sign in as usefully, undo the create so the
    // email is free to try again.
    await admin.auth.admin.deleteUser(created.user.id);
    return actionFailed("createUser", profileErr, `User not added. ${TRY_AGAIN}`);
  }

  if (role === "ca" && assigned.length > 0) {
    const { error: linkErr } = await admin
      .from("ca_companies")
      .insert(assigned.map((company_id) => ({ ca_id: created.user.id, company_id })));
    if (linkErr) {
      return actionFailed(
        "createUser",
        linkErr,
        "User added, but their companies weren't assigned. Edit the user to assign them again.",
      );
    }
  }

  await logAudit({
    action: "user_create",
    ...actorOf(actor),
    target: email,
    detail: { role, companyId: role === "company" ? companyId : undefined, assigned: role === "ca" ? assigned : undefined },
  });

  revalidatePath("/users");
  return { ok: true, message: `${email} added as ${ROLE_LABEL[role]}.` };
}

/**
 * Update an existing account: display name, role, and — depending on the
 * (possibly new) role — its company or its client assignments.
 *
 * A role change is handled here rather than as a separate action because the
 * other two fields on the form only make sense in light of it: switching
 * someone from company to ca has to drop the old company_id and start
 * accepting assignments in the same save, not leave the row in a shape the
 * database check constraint would refuse anyway.
 */
export async function updateUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let actor: Awaited<ReturnType<typeof requireRole>>;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = formData.get("role");
  const companyId = String(formData.get("companyId") ?? "").trim() || null;
  const assigned = formData.getAll("assignedCompanyIds").map(String).filter(Boolean);

  if (!userId) return { ok: false, message: "Missing user." };
  if (!isRole(role)) return { ok: false, message: "Choose a role." };
  if (role === "company" && !companyId) {
    return { ok: false, message: "Choose the company this client user belongs to." };
  }
  // An admin demoting themselves out of the role would lock the account out of
  // this very screen with no other admin necessarily on hand to undo it.
  if (userId === actor.userId && role !== "admin") {
    return { ok: false, message: "You cannot change your own role." };
  }

  const admin = createAdminClient();

  // Read first, purely for the audit entry — "role changed from ca to
  // company" reads a lot more like an accountability trail than "role is now
  // company", which loses what it used to be.
  const { data: before } = await admin.from("profiles").select("email, role").eq("id", userId).maybeSingle();

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ name: name || null, role, company_id: role === "company" ? companyId : null })
    .eq("id", userId);
  if (profileErr) return actionFailed("updateUser", profileErr, `Changes not saved. ${TRY_AGAIN}`);

  // Assignments are always fully replaced with what the form submitted — the
  // same reasoning as `saveManualInputs`: a partial update could only add, so
  // unchecking every box would silently leave the old assignments in place.
  const del = await admin.from("ca_companies").delete().eq("ca_id", userId);
  if (del.error) {
    return actionFailed("updateUser", del.error, `Details saved, but company assignments weren't updated. ${TRY_AGAIN}`);
  }

  if (role === "ca" && assigned.length > 0) {
    const ins = await admin
      .from("ca_companies")
      .insert(assigned.map((company_id) => ({ ca_id: userId, company_id })));
    if (ins.error) {
      return actionFailed("updateUser", ins.error, `Details saved, but company assignments weren't updated. ${TRY_AGAIN}`);
    }
  }

  await logAudit({
    action: "user_update",
    ...actorOf(actor),
    target: before?.email ?? userId,
    detail: {
      roleFrom: before?.role,
      roleTo: role,
      companyId: role === "company" ? companyId : undefined,
      assigned: role === "ca" ? assigned : undefined,
    },
  });

  revalidatePath("/users");
  return { ok: true, message: "Changes saved." };
}

/** Set a new password directly — there is no email flow to send a reset link through yet. */
export async function resetPassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let actor: Awaited<ReturnType<typeof requireRole>>;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!userId) return { ok: false, message: "Missing user." };
  if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return actionFailed("resetPassword", error, `Password not changed. ${TRY_AGAIN}`);

  await logAudit({
    action: "password_reset",
    ...actorOf(actor),
    target: target?.email ?? userId,
  });

  return { ok: true, message: "Password updated." };
}

/**
 * Remove an account entirely.
 *
 * Deletes the AUTH user, not just the profile row — `profiles.id` cascades
 * from `auth.users` on delete, and so does `ca_companies.ca_id`, so this call
 * alone fully revokes access and clears any client assignments. A company-role
 * account cannot sign in and see anything after this; a CA's clients simply
 * lose that assignment.
 */
export async function removeUser(userId: string): Promise<UserFormState> {
  const blocked = demoWriteBlocked();
  if (blocked) return blocked;
  let actor: Awaited<ReturnType<typeof requireRole>>;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    throw e;
  }
  if (userId === actor.userId) return { ok: false, message: "You cannot remove your own account." };

  const admin = createAdminClient();

  // Read before deleting — afterward there is no row left to say who this was.
  const { data: target } = await admin.from("profiles").select("email, role").eq("id", userId).maybeSingle();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return actionFailed("removeUser", error, `User not removed. ${TRY_AGAIN}`);

  await logAudit({
    action: "user_remove",
    ...actorOf(actor),
    target: target?.email ?? userId,
    detail: { role: target?.role },
  });

  revalidatePath("/users");
  return { ok: true, message: `${target?.email ?? "User"} removed.` };
}
