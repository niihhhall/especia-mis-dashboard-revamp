import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/shared/card";
import { CompanyAvatar } from "@/components/shared/company-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Icon } from "@/components/shared/icon";
import { companyPath } from "@/lib/company-scope";
import type { CompanyCard } from "@/lib/data/portfolio";

/**
 * "Which client?": the step in front of every company-scoped staff screen.
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
    <section>
      <PageHeader title={title} subtitle={subtitle} />
      <Card flush>
        {companies.length === 0 ? (
          <EmptyState
            title="No companies are assigned to your account yet."
            description={
              <p>
                <Link href="/companies" className="font-medium text-text-primary underline underline-offset-4">
                  Add a company
                </Link>{" "}
                on the Companies page, or ask an administrator to assign one to you.
              </p>
            }
          />
        ) : (
          <ul className="flex flex-col">
            {companies.map((c) => (
              <li key={c.id} className="border-b border-border last:border-0">
                <Link
                  href={companyPath(c.slug, destination)}
                  className="group flex min-h-13 items-center gap-3 px-5 py-2 hover:bg-surface-raised"
                >
                  <CompanyAvatar name={c.name} logoUrl={c.logoUrl} className="size-9 text-label" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words text-body font-medium text-text-primary">{c.name}</p>
                    <p className="line-clamp-2 break-words text-label text-text-secondary">
                      {hint?.(c) ?? c.group}
                    </p>
                  </div>
                  <span className="text-text-secondary group-hover:text-text-primary">
                    <Icon icon={ArrowRight} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
