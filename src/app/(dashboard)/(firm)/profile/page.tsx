import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/shared/card";
import { requireUser } from "@/lib/auth/guard";
import { getCompany } from "@/lib/data/mis";
import { ROLE_LABEL } from "@/lib/labels";

export const metadata = { title: "Profile" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-body font-medium text-text-primary">{value}</dd>
    </div>
  );
}

/** Who you are signed in as, and which company you are attached to. */
export default async function ProfilePage() {
  const profile = await requireUser();
  const company = profile.companyId ? await getCompany(profile.companyId) : null;

  return (
    <section className="max-w-2xl space-y-6">
      <PageHeader title="Profile" subtitle="Your account details." />

      <Card footer="To change your name, email or password, contact Especia Associates LLP.">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" value={profile.name ?? "-"} />
          <Field label="Email" value={profile.email ?? "-"} />
          <Field label="Role" value={ROLE_LABEL[profile.role] ?? profile.role} />
          <Field label="Company" value={company?.name ?? "All assigned companies"} />
        </dl>
      </Card>
    </section>
  );
}
