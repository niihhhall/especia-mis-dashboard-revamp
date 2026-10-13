import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/guard";
import { getCompanyCards } from "@/lib/data/portfolio";
import { plural } from "@/lib/format";

import { ArchivedCompanies } from "./archived-companies";
import { CompanyCard } from "./company-card";
import { NewCompanyForm } from "./new-company-form";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const profile = await requireUser();

  // A client has exactly one company and no list to choose from — send them
  // straight into it rather than showing a grid of one.
  if (profile.role === "company") redirect("/");

  const isAdmin = profile.role === "admin";
  // Only admin ever needs archived companies in the response at all — they're
  // the only role that can archive/unarchive (see `archiveCompany`), so a CA
  // fetching them would just be dead weight.
  const cards = await getCompanyCards(isAdmin);
  const active = cards.filter((c) => !c.archivedAt);
  const archived = cards.filter((c) => c.archivedAt);
  const who = profile.name ?? profile.email ?? "you";

  return (
    <section className="space-y-6">
      <PageHeader
        title="Companies"
        subtitle={plural(active.length, `1 company assigned to ${who}`, `{n} companies assigned to ${who}`)}
        actions={<NewCompanyForm />}
      />

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {isAdmin
            ? "No companies yet. Add a company to start uploading its MIS."
            : "No companies yet. Add a company to start uploading its MIS, or ask an administrator to assign one to you."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((c) => (
            <CompanyCard key={c.id} card={c} canEdit={profile.role === "ca" || isAdmin} canArchive={isAdmin} />
          ))}
        </div>
      )}

      {isAdmin && archived.length > 0 && <ArchivedCompanies cards={archived} />}
    </section>
  );
}
