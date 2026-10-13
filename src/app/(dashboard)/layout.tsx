import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { SessionKeepAlive } from "@/components/layout/session-keep-alive";
import { isDemoMode } from "@/lib/demo/mode";
import { AuthError, requireUser } from "@/lib/auth/guard";
import { listCompanies } from "@/lib/data/company-context";
import { getUnitSettings } from "@/lib/data/unit";
import type { ShellCompanyLink } from "@/types/shell";

/**
 * Auth guard, then the one shared shell (sidebar, top bar) for every
 * dashboard page.
 *
 * Layouts do not re-render on navigation, so the shell reads the path on the
 * client, and `c/[slug]/layout.tsx` publishes the open company to it through
 * `CompanyScope`. See `components/layout/shell-company-provider.tsx`.
 *
 * There used to be a `proxy.ts` doing this redirect earlier, before any page
 * rendered at all. It's gone: Next 16 locked Proxy to the Node.js runtime
 * with no override, and Cloudflare's adapter (this app's host) does not run
 * Node-runtime Proxy at all. This layout is now the ONLY thing standing
 * between an anonymous visitor and every protected screen, which is why it
 * fails closed rather than rendering anything on a thrown AuthError.
 * `/export/xlsx` guards itself separately, being a Route Handler outside
 * this tree entirely.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }

  const [profile, { unit, usdRate }, directory, cookieStore] = await Promise.all([
    requireUser(),
    getUnitSettings(),
    loadDirectory(),
    cookies(),
  ]);
  const demoMode = isDemoMode();

  return (
    <>
      <AppShell
        profile={{ name: profile.name, email: profile.email, role: profile.role }}
        unit={unit}
        usdRate={usdRate}
        demoMode={demoMode}
        // The shadcn sidebar cookie: only "false" means closed.
        defaultSidebarOpen={cookieStore.get("sidebar_state")?.value !== "false"}
        directory={directory}
      >
        {children}
      </AppShell>
      {!demoMode && <SessionKeepAlive />}
    </>
  );
}

/**
 * Company names for the breadcrumb and sidebar on the first paint. A failed
 * read must not take every page down: the shell then shows the slug until the
 * company layout publishes the name.
 */
async function loadDirectory(): Promise<ShellCompanyLink[]> {
  try {
    const companies = await listCompanies();
    return companies.map((c) => ({ slug: c.slug, name: c.name }));
  } catch (e) {
    console.error("Shell company directory failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
