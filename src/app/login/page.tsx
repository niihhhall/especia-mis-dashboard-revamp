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
 * makes sense — or is permitted — before sign-in.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Previously handled by proxy.ts (removed — see the note in
  // (dashboard)/layout.tsx). An already-signed-in visitor landing here —
  // a stale bookmark, the back button after login — goes straight through
  // rather than being shown the form again.
  const profile = await getSessionProfile();
  if (profile) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

  return (
    <main className="mesh-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              boxShadow: "0 6px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)",
            }}
          >
            E
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight text-foreground">Especia</p>
            <p className="text-overline font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Client Portal
            </p>
          </div>
        </div>

        <div className="card-surface p-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Access your dashboard portal.</p>
          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">Especia Associates LLP</p>
      </div>
    </main>
  );
}
