import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CompanyAvatar } from "@/components/company-avatar";
import { PageHeader } from "@/components/layout/page-header";
import { companyPath } from "@/lib/company-scope";
import type { CompanyCard } from "@/lib/data/portfolio";

/**
 * "Which client?" — the step in front of every company-scoped staff screen.
 *
 * The 1.0 portal asks the same question with a dropdown at the top of MIS
 * Upload. A list of links rather than a `<select>` because each row lands on a
 * real, linkable address (`/c/tirupati/upload`): the choice ends up in the URL,
 * where it can be bookmarked and cannot silently disagree with what the page
 * below is showing.
 */
export function CompanyChooser({
  companies,
  destination,
  title,
  subtitle,
  hint,
}: {
  companies: CompanyCard[];
  /** In-company path each row opens, e.g. "/upload". */
  destination: string;
  title: string;
  subtitle: string;
  hint?: (c: CompanyCard) => string;
}) {
  return (
    <section className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p>No companies are assigned to your account yet.</p>
          <p className="mt-1">
            <Link href="/companies" className="font-semibold text-primary underline underline-offset-2">
              Add a company
            </Link>{" "}
            on the Companies page, or ask an administrator to assign one to you.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={companyPath(c.slug, destination)}
              className="card-surface group flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
            >
              <CompanyAvatar name={c.name} logoUrl={c.logoUrl} className="size-10 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-sm font-semibold">{c.name}</p>
                <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                  {hint?.(c) ?? c.group}
                </p>
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-[translate,color] motion-safe:group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
