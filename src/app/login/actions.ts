"use server";

import { redirect } from "next/navigation";

import { actorOf, logAudit } from "@/lib/audit/log";
import { getSessionProfile, type AppRole } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  ok: boolean;
  message: string;
}

/**
 * Sign in with email + password.
 *
 * There is no sign-up counterpart by design: `enable_signup = false` in
 * config.toml, and accounts are provisioned by an admin. That is what stops
 * someone registering themselves against a company that isn't theirs.
 */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (isDemoMode()) redirect("/companies");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/";

  if (!email || !password) return { ok: false, message: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Logged under the attempted email, not an actor — there is no
    // authenticated identity yet. This is what makes a brute-force attempt
    // against one address visible in the trail, not just successful logins.
    await logAudit({ action: "login_failed", actorEmail: email });
    // Deliberately vague in the message the user sees: distinguishing "no such
    // user" from "wrong password" would tell an attacker which emails are
    // registered. The log above keeps the real detail for an admin only.
    return { ok: false, message: "Incorrect email or password." };
  }

  // Read directly by the id auth just returned, rather than reusing
  // `getSessionProfile()` — that would depend on the just-set session cookie
  // being visible to a fresh read within the same request, which is timing
  // this does not need to gamble on.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  await logAudit({
    action: "login_success",
    actorId: data.user.id,
    actorEmail: email,
    actorRole: (profile?.role as AppRole | undefined) ?? undefined,
    detail: profile ? undefined : { unprovisioned: true },
  });

  // Only ever redirect within this app — an open redirect would let a phishing
  // link bounce a freshly-authenticated user off-site.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut(): Promise<void> {
  if (isDemoMode()) return;
  // Captured before signing out — afterward there is no session left to read.
  const profile = await getSessionProfile();

  const supabase = await createClient();
  await supabase.auth.signOut();

  if (profile) await logAudit({ action: "logout", ...actorOf(profile) });
  redirect("/login");
}
