import { ArrowRight, CircleAlert, CircleCheck, Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icon } from "@/components/shared/icon";
import { StatusText } from "@/components/shared/status-text";
import { requireRole } from "@/lib/auth/guard";
import { companyPath } from "@/lib/company-scope";
import { getReviewQueue, type ReviewItem } from "@/lib/data/review";
import { plural } from "@/lib/format";

export const metadata = { title: "Review queue" };

function Row({ item }: { item: ReviewItem }) {
  const blocked = item.issues.some((i) => i.level === "blocker");

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 break-words text-card-title text-text-primary">{item.companyName}</h2>
          <p className="text-label text-text-secondary">
            {item.period.label}
            {item.period.status === "draft" && " · draft"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-text-secondary">
          <Icon icon={blocked ? CircleAlert : Info} size={14} />
          <StatusText emphasis={blocked}>{blocked ? "Needs fixing" : "Check before sending"}</StatusText>
        </span>
      </div>

      <ul className="mt-4 flex flex-col">
        {item.issues.map((issue) => (
          <li key={issue.label} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3">
            <div className="flex min-w-0 items-start gap-2">
              <span className="flex h-5 items-center text-text-secondary">
                <Icon icon={issue.level === "blocker" ? CircleAlert : Info} size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-medium text-text-primary">{issue.label}</p>
                <p className="line-clamp-2 break-words text-label text-text-secondary">{issue.detail}</p>
              </div>
            </div>
            <Link
              href={companyPath(item.slug, issue.fix)}
              className="inline-flex shrink-0 items-center gap-1 text-body font-medium text-text-primary underline-offset-2 hover:underline"
            >
              Fix {item.period.label}
              <span className="sr-only">: {issue.label}, {item.companyName}</span>
              <Icon icon={ArrowRight} size={14} />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default async function ReviewPage() {
  try {
    await requireRole(["ca", "admin"]);
  } catch {
    redirect("/");
  }

  const items = await getReviewQueue();
  const blockers = items.filter((i) => i.issues.some((x) => x.level === "blocker")).length;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Review queue"
        subtitle={
          items.length === 0
            ? "All months are ready to send."
            : `${plural(items.length, "{n} month needs attention", "{n} months need attention")}${
                blockers > 0 ? ` · ${blockers} with a blocker` : ""
              }`
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Nothing to review"
          description="Every recent month has a trial balance, closing stock, mapped ledgers and balanced Master Data."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {items.map((i) => (
            <Row key={`${i.companyId}-${i.period.id}`} item={i} />
          ))}
        </div>
      )}
    </section>
  );
}
