import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/guard";
import { getCompany } from "@/lib/data/mis";
import { ROLE_LABEL } from "@/lib/labels";

export const metadata = { title: "Profile" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-overline font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

/** Who you are signed in as, and which company you are attached to. */
export default async function ProfilePage() {
  const profile = await requireUser();
  const company = profile.companyId ? await getCompany(profile.companyId) : null;

  return (
    <section className="max-w-2xl space-y-5">
      <PageHeader title="Profile" subtitle="Your account details." />

      <div className="card-surface p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" value={profile.name ?? "—"} />
          <Field label="Email" value={profile.email ?? "—"} />
          <Field label="Role" value={ROLE_LABEL[profile.role] ?? profile.role} />
          <Field label="Company" value={company?.name ?? "All assigned companies"} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        To change your name, email or password, contact Especia Associates LLP.
      </p>
    </section>
  );
}
