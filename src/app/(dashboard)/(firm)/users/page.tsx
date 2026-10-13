import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/guard";
import { listCompanies } from "@/lib/data/company-context";
import { listUsers } from "@/lib/data/users";
import { plural } from "@/lib/format";

import { NewUserForm } from "./new-user-form";
import { UserRow } from "./user-row";

export const metadata = { title: "Users" };

const ORDER = { admin: 0, ca: 1, company: 2 } as const;

/**
 * Provision and manage logins — the piece the CA screens deliberately left
 * out. Admin-only: a CA can see and work every client they are assigned to,
 * but granting that access to someone else is a firm-level decision, not a
 * client one.
 */
export default async function UsersPage() {
  let profile;
  try {
    profile = await requireRole(["admin"]);
  } catch {
    redirect("/");
  }

  const [users, companies] = await Promise.all([listUsers(), listCompanies()]);
  const sorted = [...users].sort(
    (a, b) => ORDER[a.role] - ORDER[b.role] || (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""),
  );
  const companyOptions = companies.map((c) => ({ id: c.id, slug: c.slug, name: c.name }));

  return (
    <section className="space-y-6">
      <PageHeader
        title="Users"
        subtitle={
          <>
            {plural(sorted.length, "{n} user", "{n} users")} — who can sign in, and what they can
            reach.
          </>
        }
        actions={<NewUserForm companies={companyOptions} />}
      />

      {companies.length === 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/12 p-3 text-sm text-primary">
          No companies exist yet. A client or CA user needs one to point at. Add one from{" "}
          <Link href="/companies" className="font-semibold underline underline-offset-2">
            Companies
          </Link>{" "}
          first.
        </div>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {sorted.map((u) => (
          <UserRow key={u.id} user={u} companies={companyOptions} isSelf={u.id === profile.userId} />
        ))}
      </ul>
    </section>
  );
}
