import Link from "next/link";
import type { ReactNode } from "react";

import { AuthError, requireRole } from "@/lib/auth/guard";
import { scopedLink } from "@/lib/data/scoped-link";

/**
 * Staff-only gate for the data-entry screens (Upload, Mapping, Adjustments,
 * Master Data).
 *
 * A route group, so URLs are unchanged — `/upload` is still `/upload` — but
 * every page inside is guarded by construction rather than by remembering to
 * add a check. Hiding these from the sidebar is presentation; this is the part
 * that refuses a company user who types the address directly.
 *
 * Their server actions guard themselves too. Both are needed: rendering a page
 * and POSTing to an action are separately addressable.
 */
export default async function DataLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Links stay inside the open client rather than dropping to the chooser.
  const scoped = await scopedLink(slug);
  try {
    await requireRole(["ca", "admin"]);
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
    return (
      <section className="mx-auto max-w-lg py-16 text-center">
        <h1 className="page-title">Not available for your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This screen is for the team preparing your MIS. Your reports are under{" "}
          <Link href={scoped("/pnl")} className="font-medium text-primary underline">
            P&amp;L Detail
          </Link>
          .
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
