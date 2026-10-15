import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionProfile } from "@/lib/auth/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Sits outside the (dashboard) route group on purpose: that layout eagerly
 * fetches the company and periods and renders the sidebar shell, none of which
 * makes sense, or is permitted, before sign-in.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Previously handled by proxy.ts (removed, see the note in
  // (dashboard)/layout.tsx). An already-signed-in visitor landing here
  // (a stale bookmark, the back button after login) goes straight through
  // rather than being shown the form again.
  const profile = await getSessionProfile();
  if (profile) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-100">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-surface text-body font-semibold text-text-primary">
            E
          </span>
          <div>
            <p className="text-card-title text-text-primary">Especia</p>
            <p className="text-label text-text-secondary">Client portal</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="text-title text-text-primary">Sign in</h1>
          <p className="mt-1 mb-6 text-body text-text-secondary">Access your dashboard portal.</p>
          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-center text-label text-text-secondary">Especia Associates LLP</p>
      </div>
    </main>
  );
}
