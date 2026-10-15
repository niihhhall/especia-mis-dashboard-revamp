import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { AuditAction } from "@/lib/audit/log";
import { requireRole } from "@/lib/auth/guard";
import { listAuditEvents } from "@/lib/data/audit";
import { listCompanies } from "@/lib/data/company-context";
import { AUDIT_ACTION_LABEL } from "@/lib/labels";

import { AuditTable, type AuditRow } from "./audit-columns";
import { AuditFilters } from "./audit-filters";
import { roleName, summarize, when } from "./audit-format";
import { LoadMore } from "./load-more";

export const metadata = { title: "Audit log" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; company?: string; before?: string }>;
}) {
  try {
    await requireRole(["admin"]);
  } catch {
    redirect("/");
  }

  const { action, company, before } = await searchParams;
  const companies = await listCompanies();
  const companyId = company ? companies.find((c) => c.slug === company)?.id : undefined;

  // The filter only ever offers a key from AUDIT_ACTION_LABEL, so a value outside
  // that set can only arrive from a hand-edited URL: harmless here, since an
  // unrecognised action just matches nothing in either underlying query.
  const isValidAction = (v?: string): v is AuditAction | "master_tb_edit" => !!v && v in AUDIT_ACTION_LABEL;

  const { events, hasMore } = await listAuditEvents({
    action: isValidAction(action) ? action : undefined,
    companyId,
    before,
  });

  const actionOptions = (Object.keys(AUDIT_ACTION_LABEL) as (keyof typeof AUDIT_ACTION_LABEL)[]).map((a) => ({
    value: a,
    label: AUDIT_ACTION_LABEL[a],
  }));
  const rows: AuditRow[] = events.map((e) => ({
    e,
    actor: [e.actorEmail ?? "-", e.actorRole && roleName(e.actorRole), e.companyName, e.periodLabel].filter(Boolean).join(" · "),
    note: summarize(e),
    at: when(e.at),
  }));

  return (
    <section className="space-y-6">
      <PageHeader
        title="Audit log"
        subtitle={<>Every sign-in and every change to a company&rsquo;s MIS, across the firm.</>}
        filters={
          <AuditFilters
            action={action ?? ""}
            company={company ?? ""}
            actions={actionOptions}
            companies={companies.map((c) => ({ value: c.slug, label: c.name }))}
          />
        }
      />

      {events.length === 0 ? (
        <EmptyState title="Nothing recorded yet for this filter." />
      ) : (
        <>
          <Card flush className="py-0">
            <AuditTable rows={rows} />
          </Card>
          {hasMore && <LoadMore before={events[events.length - 1].at} action={action} company={company} />}
        </>
      )}
    </section>
  );
}
