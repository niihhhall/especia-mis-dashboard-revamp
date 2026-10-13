import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/guard";
import { companyPath } from "@/lib/company-scope";
import { getReviewQueue, type ReviewItem } from "@/lib/data/review";
import { plural } from "@/lib/format";

export const metadata = { title: "Review Queue" };

function Row({ item }: { item: ReviewItem }) {
  const blocked = item.issues.some((i) => i.level === "blocker");

  return (
    <article className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 break-words text-base font-bold leading-tight">{item.companyName}</h2>
          <p className="text-xs text-muted-foreground">
            {item.period.label}
            {item.period.status === "draft" && " · draft"}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${
            blocked
              ? "bg-danger/10 text-danger-text"
              : "bg-warning/15 text-warning-text"
          }`}
        >
          {blocked ? (
            <CircleAlert className="size-3.5" aria-hidden />
          ) : (
            <AlertTriangle className="size-3.5" aria-hidden />
          )}
          {blocked ? "Needs fixing" : "Check before sending"}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {item.issues.map((issue) => (
          <li
            key={issue.label}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                <span
                  className={`me-2 inline-block size-1.5 rounded-full align-middle ${
                    issue.level === "blocker" ? "bg-danger" : "bg-warning"
                  }`}
                  aria-hidden
                />
                {issue.label}
              </p>
              <p className="line-clamp-2 break-words text-xs text-muted-foreground">{issue.detail}</p>
            </div>
            <Link
              href={companyPath(item.slug, issue.fix)}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Fix {item.period.label}
              <span className="sr-only">: {issue.label}, {item.companyName}</span>
              <ArrowRight className="size-3" aria-hidden />
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
        title="Review Queue"
        subtitle={
          items.length === 0
            ? "All months are ready to send."
            : `${plural(items.length, "{n} month needs attention", "{n} months need attention")}${
                blockers > 0 ? ` · ${blockers} with a blocker` : ""
              }`
        }
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden />
          <p className="mt-3 text-sm font-medium">Nothing to review</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every recent month has a trial balance, closing stock, mapped ledgers and balanced
            Master Data.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((i) => (
            <Row key={`${i.companyId}-${i.period.id}`} item={i} />
          ))}
        </div>
      )}
    </section>
  );
}
