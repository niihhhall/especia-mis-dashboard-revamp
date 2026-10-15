import { PageHeader } from "@/components/layout/page-header";
import { PeriodSelector } from "@/components/layout/period-selector";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusText } from "@/components/shared/status-text";
import { requireUser } from "@/lib/auth/guard";
import { getScopedCompany } from "@/lib/data/company-context";
import { getQueries } from "@/lib/data/queries";
import { QUERY_STATUS_LABEL } from "@/lib/labels";

import { NewQueryForm, ReplyForm } from "./query-forms";

export const metadata = { title: "Notes & queries" };

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
    <section className="space-y-6">
      <PageHeader
        title="Notes & queries"
        subtitle={
          profile.role === "company"
            ? "Questions you have raised on your MIS, and the answers."
            : "Questions raised by the companies you look after."
        }
        filters={<PeriodSelector />}
      />

      {profile.role === "company" && <NewQueryForm />}

      {threads.length === 0 ? (
        <EmptyState
          title="No queries yet."
          description={profile.role === "company" ? "Ask your CA a question above." : "Questions from this company will appear here."}
        />
      ) : (
        <div className="space-y-6">
          {threads.map((q) => (
            <article key={q.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-card-title text-text-primary">{authorLabel(q.author_role, q.author_name)}</span>
                {q.period_label && <StatusText>{q.period_label}</StatusText>}
                <StatusText emphasis={q.status === "open"}>{QUERY_STATUS_LABEL[q.status] ?? q.status}</StatusText>
                <span className="ms-auto text-label text-text-secondary tabular-nums">{when(q.created_at)}</span>
              </div>

              <p className="mt-2 max-w-prose whitespace-pre-wrap break-words text-pretty text-body text-text-primary">{q.body}</p>

              {q.replies.length > 0 && (
                <ul className="mt-4 space-y-3 border-s-2 border-border ps-3">
                  {q.replies.map((r) => (
                    <li key={r.id}>
                      <p className="text-label font-medium text-text-secondary">
                        {authorLabel(r.author_role, r.author_name)} · {when(r.created_at)}
                      </p>
                      <p className="max-w-prose whitespace-pre-wrap break-words text-pretty text-body text-text-primary">{r.body}</p>
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
