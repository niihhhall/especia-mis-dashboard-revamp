import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CompanyScope } from "@/components/layout/company-scope";
import { requireUser } from "@/lib/auth/guard";
import { getScopedCompany } from "@/lib/data/company-context";
import { getMisSegments, getPeriods, getSelectedPeriod } from "@/lib/data/mis";

/**
 * The gate on every company-scoped screen, and the header that names the client.
 *
 * `getScopedCompany(slug)` returns null for an unknown slug AND for a real
 * company the caller may not reach, deliberately the same answer, so a CA
 * cannot use the difference between "no such client" and "not your client" to
 * learn which companies the firm has on its books.
 *
 * This guards RENDERING. The writes underneath are guarded separately by
 * `requireCompany()` in each server action, because a server action is a POST
 * endpoint addressable on its own and never passes through this layout.
 */
/**
 * Every page under a company names itself (`metadata.title`, its nav label);
 * this template adds the client, most specific first: "P&L Detail ·
 * Tirupati Automart · Especia MIS". `getScopedCompany` is `cache()`d, so the
 * layout below reuses this lookup. An unknown or unreachable slug gets the
 * same title as its "Company not available" screen.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = await getScopedCompany(slug);
  if (!company) {
    // No `%s`: whatever page sits under the bad slug, the tab says this.
    const title = "Company not available · Especia MIS";
    return { title: { absolute: title, template: title } };
  }
  return { title: { template: `%s · ${company.name} · Especia MIS`, default: company.name } };
}

export default async function CompanyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The shell's auth guard sits in (dashboard)/layout.tsx; this keeps the
  // company tree failing closed on its own as it always has.
  await requireUser();
  const company = await getScopedCompany(slug);

  if (!company) {
    return (
      <section className="mx-auto max-w-lg py-16 text-center">
        <h1 className="page-title">Company not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This client does not exist, or is not assigned to your account.{" "}
          <Link href="/companies" className="font-medium text-primary underline">
            Back to companies
          </Link>
          .
        </p>
      </section>
    );
  }

  const [periods, selected, segments] = await Promise.all([
    getPeriods(company.id),
    getSelectedPeriod(company.id),
    getMisSegments(company.id),
  ]);
  const periodOptions = periods.map((p) => ({ id: p.id, label: p.label }));

  return (
    <CompanyScope
      value={{
        slug: company.slug,
        name: company.name,
        periods: periodOptions,
        selected: selected ? { id: selected.id, label: selected.label } : null,
        hasSegments: segments.length > 0,
      }}
    >
      {children}
    </CompanyScope>
  );
}
