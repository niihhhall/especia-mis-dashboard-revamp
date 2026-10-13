import { requireUser } from "@/lib/auth/guard";
import { getScopedCompany } from "@/lib/data/company-context";
import { getQueries } from "@/lib/data/queries";
import { QUERY_STATUS_LABEL } from "@/lib/labels";

import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";

import { NewQueryForm, ReplyForm } from "./query-forms";

export const metadata = { title: "Notes & Queries" };

const STATUS_TONE: Record<string, string> = {
  open: "bg-warning/15 text-warning-text ring-warning/30",
  answered: "bg-success/12 text-success-text ring-success/25",
  closed: "bg-muted text-muted-foreground ring-border",
};

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Client questions and the CA's answers, threaded per query. */
export default async function QueriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await requireUser();
  const [threads, company] = await Promise.all([getQueries(), getScopedCompany(slug)]);

  // Label by viewer: a client sees "You" on its own posts; staff presenting
  // the page see who at the client asked. Staff posts always read "Especia".
  const authorLabel = (role: string | null, name: string | null) => {
    if (role === "admin" || role === "ca") return "Especia";
    if (profile.role === "company") return "You";
    return name ?? company?.name ?? "Client";
  };

  return (
    <section className="space-y-5">
      <PageHeader
        title="Notes & Queries"
        subtitle={
          profile.role === "company"
            ? "Questions you have raised on your MIS, and the answers."
            : "Questions raised by the companies you look after."
        }
        filters={<PeriodSelector />}
      />

      {profile.role === "company" && <NewQueryForm />}

      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <p>No queries yet.</p>
          <p className="mt-1">
            {profile.role === "company"
              ? "Ask your CA a question above."
              : "Questions from this company will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((q) => (
            <article key={q.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {authorLabel(q.author_role, q.author_name)}
                </span>
                {q.period_label && (
                  <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">
                    {q.period_label}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_TONE[q.status]}`}
                >
                  {QUERY_STATUS_LABEL[q.status] ?? q.status}
                </span>
                <span className="ms-auto text-xs text-muted-foreground">{when(q.created_at)}</span>
              </div>

              <p className="mt-2 max-w-prose whitespace-pre-wrap break-words text-pretty text-sm text-foreground">{q.body}</p>

              {q.replies.length > 0 && (
                <ul className="mt-3 space-y-2 border-s-2 border-border ps-3">
                  {q.replies.map((r) => (
                    <li key={r.id}>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {authorLabel(r.author_role, r.author_name)} ·{" "}
                        {when(r.created_at)}
                      </p>
                      <p className="max-w-prose whitespace-pre-wrap break-words text-pretty text-sm text-foreground">{r.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              <ReplyForm queryId={q.id} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
